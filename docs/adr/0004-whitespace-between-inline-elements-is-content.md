# ADR 0004: Whitespace between inline elements is content

- **Status**: Accepted
- **Date**: 2026-08-19
- **Context commit**: 551ceee

## Context

#236 upgraded the docs site from Astro 5 to 7. Astro 7 changed the default of `compressHTML` from `true` to `"jsx"`. The difference is what happens to whitespace sitting between two inline elements in the source:

```astro
<p>
  our code is hosted publicly on <a href="...">GitHub</a>, so you don't ...
</p>
```

Under `true`, runs of whitespace collapse to a single space, which is what a browser does with HTML. Under `"jsx"`, whitespace that spans a newline between inline elements is removed entirely, which is what JSX does with JSX.

On this site that rendered `ourGitHub` and `spyware.ephira`.

Nothing in the toolchain objects. `astro build` exits 0. Every CSS property on every element is unchanged, so a computed-style comparison passes clean. The emitted pages are smaller, which is the point of the change. The only signal is the text a reader sees.

Separately, `privacy.astro` had `<ul>` nested inside `<p>` in two places, which HTML does not allow. Astro 5's Go compiler silently inserted the closing `</p>`; Astro 7's Rust compiler does not, and left the browser's own error recovery to produce two empty `<p>` elements and a 12px taller page.

## Decision

**`compressHTML: true` is set explicitly in `docs/astro.config.mjs`**, with a comment naming the two strings it broke. The pages are hand-written HTML, so they get HTML's whitespace rules.

**Invalid markup is fixed at the source, not worked around in config.** The `<ul>`s moved out of their `<p>`s. That also corrected a bug older than the upgrade: the sentence following each list was a bare text node directly inside `.prose` and rendered with no paragraph spacing, under Astro 5 as much as under Astro 7.

## Rationale

The failure mode is what makes this worth writing down rather than just fixing. A word-joining bug survives every gate this repo has or could cheaply add. It is invisible to the build, invisible to a CSS diff, and below the threshold of any sane screenshot comparison. It is only visible in the rendered text.

`"jsx"` is a reasonable default for sites whose pages are components. It is the wrong default for prose.

## Consequences

Output is marginally larger than the Astro 7 default.

Adopting `"jsx"` later is possible but is a content migration, not a config flip: every place an inline element begins on its own source line needs an explicit space or has to be joined onto one line.

## When to revisit

If the site grows enough content that page size starts to matter, or if Astro drops `true` as an option. Either way, the check is to extract `document.body.innerText` from every page and diff it word by word against the previous build. Nothing else detects the failure.
