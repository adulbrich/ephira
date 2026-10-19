/**
 * A small reader for the command lines agents write: enough to find the
 * commands on a line and their words. It handles single and double quotes,
 * backslash escapes and continuations, `#` comments, `$(...)` substitutions
 * (returning their inner text so a caller can read the commands inside),
 * `$((...))` and `((...))` arithmetic, `<<<` here-strings, heredocs both at
 * the top level and inside a substitution, and the separators `&&`, `||`,
 * `;`, `|`, `&`, `(`, `)` and newline. It is not a shell: no globbing, no
 * variable expansion, no aliases, no backtick substitution. A word keeps a
 * substitution verbatim, as `$(cat f)`.
 *
 * `uncertain` is true when it met something it does not follow (a backtick
 * the shell would run, a substitution inside arithmetic, a quote or
 * substitution left open), so a caller can fall back to the raw text.
 */

// The delimiter is any word, quoted or not, as the shell takes it.
const HEREDOC_START = /^<<(-?)\s*(["']?)([^\s"'<>|&;()]+)\2/;

/**
 * The commands in `text`, each `{ words, heredocs }`, the inner text of every
 * `$(...)` substitution met on the way (outermost first), and `uncertain`.
 */
export function readCommands(text) {
  const state = { uncertain: false };
  const commands = [];
  const inner = [];
  let words = [];
  let heredocs = [];
  let pending = [];
  let word = null;
  let i = 0;

  const add = (part) => {
    word = (word ?? "") + part;
  };
  const endWord = () => {
    if (word !== null) {
      words.push(word);
      word = null;
    }
  };
  const endCommand = () => {
    endWord();
    if (words.length > 0) {
      commands.push({ words, heredocs });
    }
    words = [];
    heredocs = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (char === "\\") {
      if (text[i + 1] !== "\n") {
        add(text[i + 1] ?? "");
      }
      i += 2;
    } else if (char === "#" && word === null) {
      const newline = text.indexOf("\n", i);
      i = newline === -1 ? text.length : newline;
    } else if (char === "`") {
      state.uncertain = true;
      add(char);
      i += 1;
    } else if (char === "'") {
      const end = closeSingle(text, i + 1, state);
      add(text.slice(i + 1, end));
      i = end + 1;
    } else if (char === '"') {
      const { value, end } = readDouble(text, i + 1, inner, state);
      add(value);
      i = end + 1;
    } else if (text.startsWith("$((", i) || text.startsWith("((", i)) {
      const end = closeArithmetic(text, i, state);
      add(text.slice(i, end));
      i = end;
    } else if (text.startsWith("$(", i)) {
      const { body, end } = readSubstitution(text, i + 2, state);
      inner.push(body);
      add(text.slice(i, end + 1));
      i = end + 1;
    } else if (text.startsWith("<<<", i)) {
      add("<<<");
      i += 3;
    } else if (text.startsWith("<<", i)) {
      const start = HEREDOC_START.exec(text.slice(i));
      if (start) {
        endWord();
        pending.push({ dash: start[1] === "-", delimiter: start[3] });
        i += start[0].length;
      } else {
        add("<<");
        i += 2;
      }
    } else if (char === "\n") {
      for (const heredoc of pending) {
        const read = readHeredocBody(text, i + 1, heredoc);
        heredocs.push(read.body);
        i = read.end;
      }
      pending = [];
      endCommand();
      i += 1;
    } else if (text.startsWith("&&", i) || text.startsWith("||", i)) {
      endCommand();
      i += 2;
    } else if (";|&()".includes(char)) {
      endCommand();
      i += 1;
    } else if (char === " " || char === "\t") {
      endWord();
      i += 1;
    } else {
      add(char);
      i += 1;
    }
  }
  endCommand();
  return { commands, inner, uncertain: state.uncertain };
}

/** The index of the quote closing a single-quoted string opened before `from`. */
function closeSingle(text, from, state) {
  const close = text.indexOf("'", from);
  if (close === -1) {
    state.uncertain = true;
    return text.length;
  }
  return close;
}

/** The index just past the `))` closing arithmetic that starts at `from`. */
function closeArithmetic(text, from, state) {
  const close = text.indexOf("))", from);
  if (close === -1) {
    state.uncertain = true;
    return text.length;
  }
  if (/\$\(|`/.test(text.slice(from + 2, close))) {
    state.uncertain = true;
  }
  return close + 2;
}

/**
 * A double-quoted string from just after its opening quote: its value, and
 * the index of the closing quote. A substitution inside is kept verbatim and
 * its inner text pushed onto `inner`.
 */
function readDouble(text, start, inner, state) {
  let value = "";
  let i = start;
  while (i < text.length && text[i] !== '"') {
    if (text[i] === "\\" && '"\\$`\n'.includes(text[i + 1] ?? "")) {
      value += text[i + 1] === "\n" ? "" : text[i + 1];
      i += 2;
    } else if (text.startsWith("$((", i)) {
      const end = closeArithmetic(text, i, state);
      value += text.slice(i, end);
      i = end;
    } else if (text.startsWith("$(", i)) {
      const { body, end } = readSubstitution(text, i + 2, state);
      inner.push(body);
      value += text.slice(i, end + 1);
      i = end + 1;
    } else {
      if (text[i] === "`") {
        state.uncertain = true;
      }
      value += text[i];
      i += 1;
    }
  }
  if (i >= text.length) {
    state.uncertain = true;
  }
  return { value, end: i };
}

/**
 * A `$(...)` substitution from just after its `$(`: its inner text, and the
 * index of its closing parenthesis. Quotes, comments, arithmetic, nested
 * parentheses and heredocs inside are skipped as units, so a `)` or a quote
 * in them does not end it.
 */
function readSubstitution(text, start, state) {
  let depth = 1;
  let pending = [];
  let i = start;
  while (i < text.length) {
    const char = text[i];
    const wordStart = i === start || /[\s;|&(]/.test(text[i - 1]);
    if (char === "\\") {
      i += 2;
    } else if (char === "`") {
      state.uncertain = true;
      i += 1;
    } else if (char === "#" && wordStart) {
      const newline = text.indexOf("\n", i);
      i = newline === -1 ? text.length : newline;
    } else if (char === "'") {
      i = closeSingle(text, i + 1, state) + 1;
    } else if (char === '"') {
      i = readDouble(text, i + 1, [], state).end + 1;
    } else if (text.startsWith("$((", i) || text.startsWith("((", i)) {
      i = closeArithmetic(text, i, state);
    } else if (text.startsWith("<<<", i)) {
      i += 3;
    } else if (text.startsWith("<<", i)) {
      const heredoc = HEREDOC_START.exec(text.slice(i));
      if (heredoc) {
        pending.push({ dash: heredoc[1] === "-", delimiter: heredoc[3] });
        i += heredoc[0].length;
      } else {
        i += 2;
      }
    } else if (char === "\n" && pending.length > 0) {
      for (const heredoc of pending) {
        i = readHeredocBody(text, i + 1, heredoc).end;
      }
      pending = [];
      i += 1;
    } else if (char === "(") {
      depth += 1;
      i += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return { body: text.slice(start, i), end: i };
      }
      i += 1;
    } else {
      i += 1;
    }
  }
  state.uncertain = true;
  return { body: text.slice(start), end: text.length };
}

/**
 * A heredoc body starting at `from`, up to its terminator line: the body, and
 * the index of the newline that ends the terminator line (or the end of the
 * text).
 */
function readHeredocBody(text, from, { dash, delimiter }) {
  const lines = [];
  let i = from;
  while (i <= text.length) {
    const newline = text.indexOf("\n", i);
    const lineEnd = newline === -1 ? text.length : newline;
    const line = text.slice(i, lineEnd);
    if ((dash ? line.replace(/^\t+/, "") : line) === delimiter) {
      return { body: lines.join("\n"), end: lineEnd };
    }
    lines.push(line);
    if (newline === -1) {
      break;
    }
    i = newline + 1;
  }
  return { body: lines.join("\n"), end: text.length };
}
