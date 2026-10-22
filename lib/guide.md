# specky: guide for AI agents

This project keeps its requirements as JSON files that you edit directly: one **terms file** (the shared vocabulary)
and one **spec file** per ticket. `specky.json` says where they are. Run `specky check` after every edit.

Get the exact shape of a file with `specky schema specs` or `specky schema terms` (JSON Schema). The checker covers
what a schema can't, so the schema alone is not enough.

## Workflow

1. Read `specky.json`, then the terms file, then the spec you work on. Use the words of the terms file.
2. Edit the JSON. Keep the key order and the 2-space indent of the file (a hand edit that changes them only warns).
3. Append a changelog entry for every change: `{ "date": "YYYY-MM-DD", "author": "<git user.name>", "action": "...", "ref": "<ID or empty>", "summary": "<one line>" }`.
   Changelogs are append-only, oldest first. Spec actions: `added`, `changed`, `withdrawn`, `deleted`, `decision`.
   Terms actions: `added`, `changed`, `retired`, `deleted`, `question`.
4. Run `specky check`. Fix every error. Fix warnings too unless you know why they are there.

New spec: `specky new <KEY> "<title>"` (creates `<specs folder>/<KEY>.json`).

## Rules you must follow

- **IDs are forever.** Never rename or reuse an ID. To remove an item, delete it and add its ID (or a range
  `EX-LOAN-90..EX-LOAN-92`) to `withdrawn` with a reason. Texts may still mention a withdrawn ID.
- **Every rule has at least one example, and every example is listed by at least one acceptance criterion (AC).**
- **Mentions are checked.** Any text that mentions a spec ID or a reference data ID that does not exist fails the check,
  also in prose, scenarios and test steps.
- **Use `[[term-id]]` to link a term** (never `[[id|label]]`). Do not use a word listed in a term's `avoid`.
- **Reference data IDs** (`MEM-1`, `LN-4`) must not use a prefix that spec IDs use (`AC-`, `RULE-...`, `EX-...`).
  Items of one data kind share a prefix.
- **Do not invent requirements.** Where the meaning is unclear, add a question (`questions`) instead of a rule.

## Terms file

Keys: `groups`, `terms`, `questions`, `changelog`. Sorted: groups by title, terms by group order and then by name.

```json
{ "id": "loan-period", "term": "Loan period", "group": "lending",
  "definition": "The number of days a [[copy]] is lent for.", "uiLabel": "\"Lending time\"",
  "avoid": ["\"borrowing period\" (ambiguous)"], "status": "active" }
```

`id` is a lowercase slug and never changes. `status` is `active` or `retired`; a retired term needs `replacedBy`.
A question has `id` (`Q-01`), `title`, `status` (`open` or `resolved`), `terms`, `text`, and a `resolution` once resolved.

## Spec file

Top-level keys, in this order: `meta`, `sections`, `terms`, `dataKinds`, `data`, `stories`, `ruleGroups`, `rules`,
`examples`, `acceptanceCriteria`, `testCases`, `limitations`, `assumptions`, `risks`, `questions`, `decisions`,
`withdrawn`, `changelog`.

| Item | ID pattern | Shape |
|---|---|---|
| story | `US-LOAN-01` | `{ id, title, text, setup, readiness }` |
| rule group | free text (`6.1`) | `{ id, title, story, note }` |
| rule | `RULE-LOAN-01` | `{ id, group, statement }` |
| example | `EX-LOAN-01` | `{ id, rule, text }` (one rule per example) |
| acceptance criterion | `AC-01`, `AC-02a` | `{ id, story, title, status, statusNote, rules[], examples[], description, scenarios[], notes }` |
| test case | `TC-01` | `{ id, title, acs[], status, steps, automation }` |
| known limitation | `KL-01` | `{ id, title, text, affects[], followUp }` |
| assumption | `ASM-LOAN-01` | `{ id, text, affects[] }` |
| risk | `R-LOAN-01` | `{ id, text, likelihood, impact, acs[], testApproach }` (ratings 1 to 3) |
| question | `Q-LOAN-01` | `{ id, text, blocks, askedTo, status, resolution }` |
| decision | none | `{ date, text, refs[] }` |
| withdrawn | none | `{ ids[], reason }` |
| reference data kind | lowercase slug | `{ id, label, title, columns[], derived[] }` |
| reference data item | `MEM-1`, `LN-4` | `{ id, kind, values{ column: text } }`, optional `"testOnly": true` |

Spec item ID pattern: `^[A-Z]+(-[A-Z]+)*-[0-9]+[a-z]?$`. `AC-02a` is an AC inserted after `AC-02`.

- AC `status`: `draft`, `pending`, `implemented`, `known-limitation`, `target`. Test case `status`: `draft`, `ready`,
  `passed`, `failed`, `blocked`.
- Every `scenarios` entry is Gherkin and starts with `Scenario:` or `Scenario Outline:`. An AC needs scenarios or a
  `description`.
- `terms` lists the term ids the spec relies on. Definitions live only in the terms file.
- `sections` is the page in order: `{ id, title, body (Markdown), list? }`. A non-empty list that no section shows warns.
- All text fields are Markdown. IDs and `[[term-id]]` in text become links.

## Good examples

An example is one concrete case with named reference data and exact values, so a test can be written from it:

> `EX-LOAN-09`: MEM-2 renews LN-7, which is overdue by exactly 7 days. The renewal is allowed: the 7th day still counts.

Write examples at the boundaries (7 days, 8 days), not only in the middle. Prefer an existing reference data item to a
new one.
