# ephira

## Always

Tools enforce these where they can, so a refusal names the rule you hit.
`CONTRIBUTING.md`, "The gates", says which hook, script and check covers which.

- **Punctuate with commas, colons, parentheses or a new sentence, and use words
  for a status mark:** no emdash and no emoji in commits, comments, string
  literals, docs, PR or issue text.
- **Conventional Commits, lowercase imperative subject:**
  `fix(calendar): keep the open Section on close`. The body, if any, says why.
  Keep the `Co-Authored-By` trailer the harness supplies.
- **Keep `claude.ai/code/session` links out of everything you publish:** commits,
  PRs, issues and comments. The repo is public.
- **Stage files by name.**
- **Branch before committing:** fetch, branch from `origin/main` as `type/name`,
  push, open a PR, let the required checks go green.

## Pull requests

Every PR goes through the **review loop** in `CONTRIBUTING.md` before it merges:
`mattpocock-skills:code-review`, `correctness-review` and `app-security-review`,
with each pass count, the commit the last passes saw and every declined finding
recorded in the PR body.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `adulbrich/ephira`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, using their default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Code review

The standards sources the code-review skill reads here. See `docs/agents/code-review.md`.
