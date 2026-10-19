# Code review

Local deltas from the defaults of `mattpocock-skills:code-review`, the conformance
pass of the review loop in `CONTRIBUTING.md`:

- **The Standards axis reads these sources and no others:** `AGENTS.md`,
  `CONTRIBUTING.md` (for branch, commit and PR rules), `CONTEXT.md`, the ADRs under
  `docs/adr/` that touch the diff, and, for a test file, the Testing section of
  `PROJECTSTRUCTURE.md`. Grep them for the sections the diff reaches. `README.md`
  describes the project, not how its code is written.
- **Comments are standards too.** The headers of `biome.jsonc` and `eslint.config.js`
  say why each rule is on or off. A diff that adds a suppression for a rule the header
  says was turned on after a burn-down is a finding.
- **The Spec axis reads the issue the PR closes.** Plans under `docs/plans/` are
  history, not specs, unless the issue links one.
