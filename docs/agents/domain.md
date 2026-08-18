# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**Layout: single-context.** One `CONTEXT.md` and one `docs/adr/` at the repo root cover the whole project.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the glossary and ubiquitous language.
- **`docs/adr/`** — read the ADRs that touch the area you're about to work in.

Both exist as of 2026-08-18. `CONTEXT.md` defines Day, Logged Day, Section, Catalogue, Entry, Cycle, Prediction, Prediction Snapshot, Marked Dates, Tracking Mode and Gestational Age, and records the names we avoid. `docs/adr/0001` records why the cycle and pregnancy tracking modes are deliberately not merged; read it before proposing anything that unifies them.

For terms or decisions not yet covered, **proceed silently**. Don't flag a gap; don't suggest filling it upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) adds to these files lazily, when a term or decision actually gets resolved.

Note: `docs/` in this repo is also the Astro site for ephira's public pages. `docs/adr/` and `docs/agents/` are plain markdown that sit alongside it and are not part of the site build (Astro only builds `docs/src/pages` and `docs/public`).

## File structure

```
/
├── CONTEXT.md
├── docs/
│   ├── adr/
│   │   └── 0001-keep-cycle-and-pregnancy-modes-separate.md
│   ├── agents/            ← this file, plus issue-tracker.md and triage-labels.md
│   ├── plans/             ← dated implementation plans
│   └── src/               ← the Astro site, unrelated to the above
├── app/
├── components/
└── db/
```

If this repo ever splits into genuinely separate bounded contexts, switch to multi-context by adding a root `CONTEXT-MAP.md` that points at one `CONTEXT.md` per context, with context-scoped `docs/adr/` directories beside each.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
