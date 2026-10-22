# Contributing to specky

This file is for people who change specky itself. To use it in a project, read the [README](README.md).

If you are an AI agent, read [AGENTS.md](AGENTS.md) too: it holds the rules for this repository.

## Repository layout

The tool (the npm package) and the example (data and config) are separate folders. The package never contains project
data.

```
package.json
bin/specky.mjs           command line: init, new, check, serve
lib/
  config.mjs             finds and reads specky.json
  check.mjs              the check command
  check-terms.mjs        checks of the terms file
  specs-lib.js           shared logic: key order, serialization, spec checks (used by specs.html and the checker)
  serve.mjs              the serve command
  init.mjs               the init and new commands
pages/
  terms.html             viewer and editor of the terms
  specs.html             viewer and editor of one specification
schemas/
  terms.schema.json      JSON Schema of the terms file
  specs.schema.json      JSON Schema of a specification
examples/library/        a project that uses the tool (library lending domain), not part of the package
  specky.json            its config
  terms/terms.json       its terms
  specs/LIB-101.json     its specification
```

`package.json` lists `bin`, `lib`, `pages` and `schemas` in `files`, so only those (plus README and LICENSE) are published.

## Ground rules

- No dependencies. The CLI uses only Node built-ins, and the pages load Bootstrap 5.3.3 from a CDN and nothing else.
- Node 18 or newer. The CLI is ES modules (`.mjs`). `lib/specs-lib.js` stays CommonJS-compatible, so `specs.html` can load
  it from `file://`.
- Both pages are single, self-contained HTML files. No build step.
- The repository is a public example: no real company, product, client or person. The example domain is a public library.
- Tool code finds data only through `lib/config.mjs`. Never hard-code a data path in `lib/` or `bin/`.

## Working on it

There are no unit tests. Check the example, validate it against the schemas, and click through the pages.

```bash
# The example project
cd examples/library
node ../../bin/specky.mjs check
node ../../bin/specky.mjs serve        # http://localhost:8000

# Schemas (needs network the first time), from the repository root
npx ajv-cli@5 validate --spec=draft2020 -s schemas/specs.schema.json -d examples/library/specs/LIB-101.json
npx ajv-cli@5 validate --spec=draft2020 -s schemas/terms.schema.json -d examples/library/terms/terms.json
```

`npm run check:example` runs the first check from the repository root.

Expected output of the check:

```
terms/terms.json: OK (14 terms, 2 questions)
specs/LIB-101.json: OK (12 ACs, 10 rules, 19 examples, 6 test cases, 33 data items)
```

Test a change to a page in Chrome or Edge through `specky serve`. To try the CLI in a fresh project, run
`node <path to this repository>/bin/specky.mjs init` in an empty folder.

## Where a change goes

- **A check on a spec:** `lib/specs-lib.js` only. It serves the page and the CLI.
- **A check on terms:** both `lib/check-terms.mjs` and the check code in `pages/terms.html`, with the same sort order.
- **A field:** the schema in `schemas/`, `ORDER`, `TEXT_FIELDS` and `REF_FIELDS` in `lib/specs-lib.js`, the form
  definitions in `pages/specs.html`, and the README, together.
- **The server:** `lib/serve.mjs` maps the pages and the data onto one flat URL space (`/specs.html`, `/terms.json`,
  `/<SPEC>.json`), and the pages fetch `terms.json` and `?spec=NAME.json` relative to themselves. Change both sides together.
- **Behaviour:** update the README in the same change: commands, checks, ID table, field tables and the quoted example data
  (`RULE-LOAN-05`, `EX-LOAN-09`, `LN-7`, the expected checker output).

## Screenshots and logo

`docs/images/` holds the logo and the README screenshots. They show the example project, so retake them when a page's look
or the example changes. With `specky serve` running in `examples/library` (port 8124 here):

```bash
chrome --headless=new --hide-scrollbars --window-size=1400,900 --virtual-time-budget=10000 \
  --screenshot=docs/images/terms.png http://localhost:8124/terms.html
```

The pages need the network once for Bootstrap. The images are not part of the npm package.

## The example data

It is the specification of the tool, so it must follow its own rules: it passes `specky check` without errors or warnings
and passes the schema validation, and IDs are never renamed or reused (withdraw them). Spec files keep the format that
`serialize` in `lib/specs-lib.js` writes. Every change to a data file appends a changelog entry (see the README for the
actions). Use "Jane Doe" and "John Roe" as example authors.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), one line: `feat(specs): ...`, `fix(terms): ...`,
`docs: ...`, `chore: ...`.

## Releases

Versions follow semantic versioning. A change to the file format is a major version, and its release notes say what
clients must change. To publish:

```bash
npm version <patch|minor|major>        # bumps package.json and tags
npm pack --dry-run                     # check the file list
npm publish
```
