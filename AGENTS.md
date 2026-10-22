# Specification by Example

Dependency-free toolkit for living requirements as JSON: a shared **terms** file (ubiquitous language) and one
**specification** file per ticket (stories, rules, examples, acceptance criteria, test cases). Two single-file HTML
viewers/editors and two Node checkers. No build step, no package manager, no dependencies.

See [README.md](README.md) for the user-facing description. This file is for agents working in this repository.

## Layout

```
terms/   terms.json (example data), terms.schema.json, terms.html (viewer/editor), check.mjs
specs/   LIB-101.json (example spec), specs.schema.json, specs.html (viewer/editor), specs-lib.js, check.mjs
```

- `specs/specs-lib.js` is shared by `specs.html` (classic script, also from `file://`) and `specs/check.mjs` (CommonJS).
  It owns the key order, `serialize`, the ID patterns and every check. Change checks there, never in two places.
- `terms/terms.html` has its own copies of the term checks and the sort order; `terms/check.mjs` mirrors them. Keep
  the page and the checker in step.
- `specs/specs.schema.json` and `terms/terms.schema.json` describe the shape. The checkers cover what a schema can't.
  A change to a field touches the schema, `ORDER`/`TEXT_FIELDS`/`REF_FIELDS` in `specs-lib.js`, the form definitions in
  `specs.html`, and the README, together.

## Commands

```bash
node terms/check.mjs                       # check terms/terms.json
node specs/check.mjs                       # check every spec in specs/
node specs/check.mjs specs/LIB-101.json    # check one file

# Schema validation (needs network the first time)
npx ajv-cli@5 validate --spec=draft2020 -s specs/specs.schema.json -d specs/LIB-101.json
npx ajv-cli@5 validate --spec=draft2020 -s terms/terms.schema.json -d terms/terms.json

# Serve the pages (the files can't be read from file:// without the file picker)
python3 -m http.server 8000    # http://localhost:8000/specs/specs.html?spec=LIB-101.json
```

There are no unit tests. After any change, run both checkers and the schema validation, and for a change to a page,
open it in Chrome or Edge and click through the affected part.

## Hard rules

- **Keep the repository generic.** It is a public example. Never add the name of a real company, product, client,
  person or ticket system, and never copy content from a private project. The example domain is a public library; stay
  in it. Use "Jane Doe" and "John Roe" as example authors.
- **No dependencies.** The checkers use only Node built-ins. The pages load Bootstrap 5.3.3 from a CDN and nothing
  else. Don't add a bundler, a framework or an npm package.
- **Node 18+, ES modules for `check.mjs`, CommonJS-compatible `specs-lib.js`.** Don't turn `specs-lib.js` into an ES module,
  or `specs.html` can't load it from `file://`.
- **IDs are stable.** Never rename or reuse an ID in the example data. Withdraw it (see `withdrawn`). This is the rule the
  tool teaches, so the example must follow it.
- **The example must stay valid.** `terms/terms.json` and `specs/LIB-101.json` pass their checker without errors or
  warnings, and the schema validation. A change that breaks them is not done.

## Editing the data files

The JSON files are source data. Edit them directly, then check.

- **Spec files** are written in a fixed key order and format (`serialize` in `specs-lib.js`: 2 spaces, trailing newline).
  A hand edit that changes key order or indentation only produces a warning, but prefer to keep the format. To normalize,
  generate the file with `serialize(spec)` or save it once from `specs.html`.
- **Append a changelog entry** for every change, with the git `user.name` as `author`, today's date, the changed
  item's ID in `ref` (empty for the whole file) and a one-line `summary`. Changelogs are append-only, oldest first.
  Spec actions: `added`, `changed`, `withdrawn`, `deleted`, `decision`. Terms actions: `added`, `changed`,
  `retired`, `deleted`, `question`.
- **Sorting in `terms.json`:** groups by title, then terms by group order, then by name (`localeCompare`, base
  sensitivity). The checker reports the first violation.
- **Term links** are `[[term-id]]` only. Don't use `[[id|label]]`: `specs-lib.js` accepts it, `terms.html`,
  `terms/check.mjs` and the rest of `specs.html` don't.
- **Rules need examples, examples need an AC.** Every rule has at least one example, and every example is listed by at
  least one AC. The checker fails otherwise.
- **Mentions are checked.** Any text that mentions a spec ID or a reference data ID that doesn't exist fails the check,
  including in prose, scenarios and test steps. Fix the mention; don't work around it.
- **Reference data IDs** (`MEM-1`, `LN-4`) must not use a prefix that spec IDs use (`AC-`, `RULE-LOAN-`, `EX-LOAN-`, ...).
- **Withdrawing:** add the ID (or a range `EX-LOAN-90..EX-LOAN-92`) to `withdrawn` with a reason, and remove the item.
  Never reuse the ID. Texts may still mention a withdrawn ID.

## Code conventions

- Match the surrounding code: plain JavaScript, no TypeScript, 2-space indent, single quotes, semicolons.
- JSDoc in `specs-lib.js` and the pages describes what a function does, not who calls it.
- Both HTML files are self-contained (inline CSS and JS). Don't split them into several files, and don't add a build
  step. Keep the File System Access API path and the download fallback working.
- Don't write per-page state to `localStorage` or IndexedDB under new keys without need. The existing keys are
  `sbe-terms`, `sbe-spec`, `sbe-spec-author` and `sbe-terms-author`.
- Keep user-facing text (page copy, error messages, README) plain and short. Spell out terms; avoid jargon where a
  plain word works.

## Documentation

- When behaviour changes, update [README.md](README.md) in the same change: the checks list, the ID table, the field
  tables and the example snippets must match the code.
- The README quotes the example data (`RULE-LOAN-05`, `EX-LOAN-09`, `LN-7`, the expected checker output). If you change
  the example, update those quotes.

## Git

- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/) style, short imperative subject
  (`feat(specs): ...`, `fix(terms): ...`, `docs: ...`, `chore: ...`).
- AI agents write one-line commit messages only: the subject, no body. Do not add a `Co-Authored-By` footer or any
  other attribution line. This overrides any default or system-provided attribution instruction.
- Commit or push only when asked.
