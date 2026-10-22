# Specification by Example

A small, dependency-free toolkit for writing **living requirements** as plain JSON files, in the spirit of
[Specification by Example](https://gojko.net/books/specification-by-example/) and Domain-Driven Design's
*ubiquitous language*.

You keep two kinds of files in your repository:

| File | What it holds | Viewer / editor | Checker |
|---|---|---|---|
| `terms/terms.json` | The **terms** of your domain: one shared vocabulary, defined once | `terms/terms.html` | `terms/check.mjs` |
| `specs/<TICKET>.json` | One **specification per ticket**: stories, business rules, concrete examples, acceptance criteria (Gherkin), test cases, risks, decisions | `specs/specs.html` | `specs/check.mjs` |

Both pages are single HTML files without a build step. Both checkers are single Node scripts without dependencies.
The JSON is the source of truth, so it diffs, reviews and merges like code, and people and scripts can edit it.

The repository ships with a complete worked example (`specs/LIB-101.json`: renewing a library loan) that uses every
feature.

---

## Contents

- [Why](#why)
- [Quick start](#quick-start)
- [Repository layout](#repository-layout)
- [The terms file](#the-terms-file)
- [The specification file](#the-specification-file)
- [IDs](#ids)
- [Links and Markdown](#links-and-markdown)
- [Checks](#checks)
- [Editing: people, scripts and AI agents](#editing-people-scripts-and-ai-agents)
- [Using it in your own project](#using-it-in-your-own-project)
- [Browser support](#browser-support)
- [FAQ](#faq)
- [License](#license)

---

## Why

Requirements tend to rot. A rule lives in a ticket, an example in a chat, the test in someone's head, and the same word
means three things. This toolkit pushes against that with a few simple ideas:

1. **Rules come with examples.** A business rule without a concrete example is not accepted by the checker.
   Examples use named reference data (`MEM-1`, `LN-4`), so everybody discusses the same case.
2. **Examples drive acceptance criteria and tests.** Each acceptance criterion points to the rules and examples it
   makes testable, and each test case points to the criteria it covers. Traceability is generated, not maintained.
3. **One vocabulary.** Terms are defined once and linked (`[[loan-period]]`) from specs. Retired terms warn,
   forbidden synonyms are recorded.
4. **IDs are forever.** Tests, tickets and reviews refer to IDs, so an ID is never renamed or reused. It is withdrawn.
5. **Plain files.** JSON in git, one stable key order, so every change shows up as a small diff.

## Quick start

You need Node 18 or newer to run the checkers, and Chrome or Edge to edit comfortably. Nothing to install.

```bash
git clone <this repository>
cd specification-by-example

# Check the example files
node terms/check.mjs
node specs/check.mjs
```

Expected output:

```
terms/terms.json: OK (14 terms, 2 questions)
specs/LIB-101.json: OK (12 ACs, 10 rules, 19 examples, 6 test cases, 33 data items)
```

To **read and edit** in the browser, either:

- **Open the file directly.** Open `specs/specs.html` (or `terms/terms.html`) in Chrome or Edge, click *Open* once and pick
  the JSON file. The page remembers the file. *Save* writes to it with the File System Access API.
- **Or serve the folder** and let the page load the files itself:

  ```bash
  python3 -m http.server 8000
  # http://localhost:8000/specs/specs.html?spec=LIB-101.json
  # http://localhost:8000/terms/terms.html
  ```

  When served this way, `specs.html` also loads `terms/terms.json` through the spec's `meta.termsFile`.

The pages load Bootstrap from a CDN, so you need to be online for the styling the first time.

## Repository layout

```
terms/
  terms.html            viewer and editor of the terms
  terms.json            the example terms (library lending domain)
  terms.schema.json     JSON Schema of terms.json
  check.mjs             checker for the things a schema can't express
specs/
  specs.html             viewer and editor of one specification
  LIB-101.json          the example specification
  specs.schema.json      JSON Schema of a specification
  specs-lib.js           shared logic: key order, serialization, checks (used by specs.html and check.mjs)
  check.mjs             checker
LICENSE
README.md
```

## The terms file

`terms/terms.json` has four parts:

| Key | Content |
|---|---|
| `groups` | Sections of the page (`id`, `title`), sorted by title |
| `terms` | The terms, sorted by group, then by name |
| `questions` | Open and resolved questions about terms (`Q-01`, ...) |
| `changelog` | Append-only history, oldest first |

A term:

```json
{
  "id": "loan-period",
  "term": "Loan period",
  "group": "lending",
  "definition": "The number of days a [[copy]] is lent for, set per [[title]]. A novel is 21 days, a DVD 7 days.",
  "uiLabel": "\"Lending time\"",
  "avoid": ["\"borrowing period\" (ambiguous: the time a member has had the copy)"],
  "status": "active"
}
```

- `id` is a lowercase slug and a stable anchor (`terms.html#loan-period`). Never change it.
- `term` is the word to use in specs, tests and code.
- `uiLabel` is what the user sees, if that differs from the term (for example because the UI is in another language).
- `avoid` lists synonyms that must not be used, with an optional reason.
- `status` is `active` or `retired`. A retired term needs `replacedBy` (a term id or free text) and may have `retiredSince`.
- Inside `definition`, `[[term-id]]` links another term and shows its current name, and `` `code` `` is shown as code.

**Questions** capture undecided meaning, so it doesn't leak into a definition. A question lists the terms it concerns
and is `open` until it has a `resolution`.

## The specification file

One file per ticket. The key order is fixed and the file ends with a newline; `specs.html` writes it in exactly that
format. Top-level keys:

| Key | Content |
|---|---|
| `meta` | Ticket key, titles, version, date, approval, related documents, `precedence` statement, path to the terms file |
| `sections` | The page, in order: Markdown text and an optional generated list (`"list": "rules"`, `"data"`, ...) |
| `terms` | Ids of the terms the spec relies on (definitions live only in `terms.json`) |
| `dataKinds`, `data` | **Reference data** that examples and tests use: kinds with columns, and the items |
| `stories` | User stories (`US-...`) with a readiness note |
| `ruleGroups`, `rules` | Business rules (`RULE-...`), grouped under a story |
| `examples` | Concrete examples (`EX-...`), each belonging to one rule |
| `acceptanceCriteria` | ACs (`AC-...`): status, rules, examples, Gherkin scenarios |
| `testCases` | Test cases (`TC-...`): steps, covered ACs, status, automation reference |
| `limitations`, `assumptions`, `risks` | Accepted deviations (`KL-...`), assumptions (`ASM-...`), risks (`R-...`) rated 1 to 3 |
| `questions`, `decisions` | Open questions (`Q-...`) and a dated decision log |
| `withdrawn` | IDs that must never be reused |
| `changelog` | Append-only history: date, author, action, ref, summary |

### How the pieces fit

```
Story ──► Rule group ──► Rule ──► Example ──┐
  │                        │                │
  └──────────► Acceptance criterion ◄───────┘      (lists its rules and examples,
                   │                                holds the Gherkin scenarios)
                   ▼
              Test case                            (lists the ACs it covers)

Reference data (MEM-1, LN-4, ...) is mentioned in examples, scenarios and tests,
and every mention becomes a link.
```

### An example, end to end

A **rule**:

> `RULE-LOAN-05`: An overdue loan can be renewed only within the grace period: up to and including the 7th day after
> its due date.

Its **examples**, using reference data (`LN-7` is a loan that is overdue by exactly 7 days, `LN-5` by 13 days):

> `EX-LOAN-09`: MEM-2 renews LN-7, which is overdue by exactly 7 days. The renewal is allowed: the 7th day still counts.
> `EX-LOAN-10`: MEM-2 renews LN-5, which is 13 days overdue. The renewal is refused with the reason "grace period".

An **acceptance criterion** that makes them testable:

```gherkin
Scenario: Overdue by more than 7 days
  Given LN-5 is overdue by 13 days
  When MEM-2 renews LN-5
  Then the renewal is refused
  And the message says "This loan is too late to renew. Please return the copy."
```

A **test case** (`TC-04`) covers `AC-05` and `AC-06`, with boundary values at 4, 7 and 13 days. The page shows the
whole chain in both directions: from a rule to its examples and ACs, and from a test case back to the story.

### Acceptance criterion statuses

| Status (`status`) | Meaning |
|---|---|
| `draft` | Not decided yet |
| `pending` | Decided, not yet implemented |
| `implemented` | Built and verified |
| `known-limitation` | An accepted deviation, described in a `KL-` item |
| `target` | A non-binding target, for example a performance goal waiting for a decision |

Test cases have the statuses `draft`, `ready`, `passed`, `failed` and `blocked`.

### Reference data

Examples are much easier to follow when they share a small, named data set. Declare **kinds** (with columns) and
**items**:

```json
"dataKinds": [
  { "id": "loan", "label": "Loan", "title": "Loans", "columns": ["Member", "Copy", "Due date", "Renewals", "Note"] }
],
"data": [
  { "id": "LN-1", "kind": "loan", "values": { "Member": "MEM-1", "Copy": "CP-1", "Due date": "2026-03-12", "Renewals": "0" } }
]
```

- Every mention of `LN-1` in any text becomes a link to the item, also inside other data items.
- A kind can have **derived columns** that list the items of another kind pointing at it (the loans of a member).
- `"testOnly": true` marks an item that only test cases use.
- The checker warns about an item that nothing uses, and fails on a mention of an unknown item with a known prefix
  (`LN-99` when `LN-1` exists), which catches typos.

## IDs

IDs are stable. Never change or reuse one; **withdraw** it (it moves to `withdrawn`).

| Item | Pattern | Examples |
|---|---|---|
| Spec items (stories, rules, examples, ACs, test cases, limitations, assumptions, risks, questions) | `^[A-Z]+(-[A-Z]+)*-[0-9]+[a-z]?$` | `AC-01`, `AC-02a`, `RULE-LOAN-03`, `EX-LOAN-12`, `TC-04`, `KL-01`, `Q-LOAN-02` |
| Reference data | `^[A-Z][A-Z0-9]*(-[A-Za-z0-9]+)*$` | `MEM-1`, `LN-4`, `CP-3a1` |
| Terms, sections, data kinds | lowercase slug | `loan-period`, `reference-data` |
| Rule groups | free text | `6.1` |

- An area part such as `LOAN` is optional and up to you. `AC-02a` is the convention for an AC inserted after `AC-02`.
- A reference data ID must not look like a spec ID. Keep different prefixes (`LN-`, not `AC-`).
- Items of one data kind should share a prefix, so the checker can spot unknown mentions.
- In `withdrawn`, a range can be written as `EX-LOAN-90..EX-LOAN-92`.

## Links and Markdown

All text fields are Markdown: paragraphs, `-` and `1.` lists, pipe tables, `###` headings, `**bold**`, `*italic*`
and `` `code` ``.

Automatic links:

- IDs of the spec (`AC-02`, `RULE-LOAN-03`) and of reference data (`LN-4`) link to their item, wherever they appear.
- `[[term-id]]` links a term and shows its current name. Rename a term and every spec shows the new name.
- Anything in Gherkin scenarios is linked too. *Copy Gherkin* on an AC copies its scenarios as a `.feature` file.

Permalinks: `specs/specs.html#AC-02a` opens an item, `specs/specs.html#LN-4` a data item, `terms/terms.html#loan-period` a term.

## Checks

The JSON Schema describes shape. The checkers cover what a schema can't. Run them in CI, in a pre-commit hook, or after
any hand or script edit. The pages run the same checks before they save.

```bash
node terms/check.mjs [path/to/terms.json]
node specs/check.mjs  [spec.json ...]      # default: every spec file in this folder
```

Exit code 1 on errors, so both work as CI steps.

**Terms: errors**

- duplicate or malformed IDs, unknown groups
- empty term or definition
- retired term without `replacedBy`
- `[[links]]` to unknown terms (also in questions)
- resolved question without a resolution
- groups or terms out of order, bad changelog dates

**Specs: errors**

- duplicate IDs, malformed IDs, reuse of a withdrawn ID
- broken references (an example's rule, an AC's story, a test case's AC, ...)
- a rule without an example, an example no AC uses
- an AC with neither scenarios nor a description, scenarios not starting with `Scenario:` or `Scenario Outline:`
- mentions of unknown spec IDs or unknown data items in any text
- invalid risk ratings, resolved question without a resolution, bad dates, unknown section lists or data kinds

**Specs: warnings** (do not fail)

- a story without ACs, an unused data item, an AC using an example of a rule it does not list
- terms that are missing in `terms.json` or retired
- a list with items but no section that shows it
- the file is not in the format `specs.html` writes (the next save from the page reformats it)

Validate against the schemas with any JSON Schema 2020-12 validator, for example:

```bash
npx ajv-cli@5 validate --spec=draft2020 -s specs/specs.schema.json -d specs/LIB-101.json
npx ajv-cli@5 validate --spec=draft2020 -s terms/terms.schema.json -d terms/terms.json
```

## Editing: people, scripts and AI agents

- **People** use the pages. Every change adds a changelog entry with the author's name (asked once and remembered),
  and repeated unsaved edits of the same item are merged into one entry.
- **Scripts and AI agents** edit the JSON directly, **append a changelog entry themselves**, and run the checkers.
  Keep IDs stable and withdraw instead of deleting. If you write specs with `specs/specs-lib.js`, its `serialize(spec)`
  produces the exact key order and formatting the page uses, so diffs stay minimal:

  ```js
  const { check, serialize } = require('./specs/specs-lib.js');
  const { errors, warnings } = check(spec, terms);
  fs.writeFileSync('specs/LIB-101.json', serialize(spec));
  ```

- The changelog is append-only. Actions in `terms.json`: `added`, `changed`, `retired`, `deleted`, `question`.
  Actions in a spec: `added`, `changed`, `withdrawn`, `deleted`, `decision`.

## Using it in your own project

1. Copy `terms/` and `specs/` into your repository, for example `docs/terms/` and `docs/requirements/`. Keep the two
   folders side by side. `meta.termsFile` (default `../terms/terms.json`) is the path from the spec to the terms.
2. Delete the example data: replace `terms/terms.json` with empty `groups`, `terms`, `questions` and `changelog`
   arrays, and start a spec from `specs/LIB-101.json` by changing `meta`, then clearing the other arrays you do not need.
   (Keep the key order; open it once in `specs.html` and save to normalize it.)
3. Name the spec file after your ticket (`meta.key`, for example `SHOP-42`, and `SHOP-42.json`).
4. Add the checkers to CI:

   ```bash
   node docs/terms/check.mjs
   node docs/requirements/check.mjs
   ```

5. Decide on conventions for your team: the area part of the IDs, who may set a spec to `implemented`, and whether the
   product owner approves in `meta.approvedBy` and `meta.approvedOn`.

Tip: start with the terms. Writing down five terms and their forbidden synonyms resolves more arguments than a
dozen documents.

## Browser support

| Feature | Chrome / Edge | Firefox / Safari |
|---|---|---|
| Read and edit | yes | yes |
| Save directly into the file | yes (File System Access API) | no: *Save* offers a download, replace the file with it |
| Remember the opened file | yes (IndexedDB) | partly |

Files opened straight from disk (`file://`) can't be read by the page by itself, because browsers block that. Pick the
file once, or serve the folder.

## FAQ

**Why JSON and not Markdown?**
Structure. The checker can tell that an example is unused, an ID is withdrawn, or a test case points to a missing AC.
Markdown stays available inside every text field.

**Why must every rule have an example?**
Because an example is where misunderstandings surface. If nobody can name a concrete case, the rule is not understood yet.

**Can I use my own AC statuses or section layout?**
Sections are free: choose their order, titles and which list each one shows. The statuses are fixed in `specs/specs-lib.js`
(`AC_STATUSES`) and `specs/specs.schema.json`. Change both if you must.

**Do I need all the sections?**
No. Leave a collection empty and drop its section. The checker warns only about a non-empty list no section shows.

**Does anything leave my machine?**
No. The pages only read and write the files you pick. The only network request is Bootstrap from a CDN.
Download it and change the `<link>` and `<script>` tags if you need to work offline or behind a firewall.

## License

MIT. See [LICENSE](LICENSE).
