#!/usr/bin/env node
// Checks spec files for problems the JSON Schema can't express: duplicate or withdrawn IDs, broken references,
// rules without examples, unknown IDs in text, and terms missing in terms/terms.json (warnings).
// Usage: node specs/check.mjs [spec.json ...]   (default: every spec file in specs)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { check, serialize } = createRequire(import.meta.url)('./specs-lib.js');

const files = process.argv.length > 2 ? process.argv.slice(2)
  : readdirSync(here).filter((f) => f.endsWith('.json')).map((f) => join(here, f))
    .filter((f) => /specs\.schema\.json$/.test(JSON.parse(readFileSync(f, 'utf8')).$schema ?? ''));
let failed = false;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const spec = JSON.parse(text);
  const termsPath = resolve(dirname(file), spec.meta?.termsFile || '../terms/terms.json');
  const terms = existsSync(termsPath) ? JSON.parse(readFileSync(termsPath, 'utf8')) : null;
  const { errors, warnings } = check(spec, terms);
  if (serialize(spec) !== text) warnings.push('the file is not in the format specs.html writes (key order or indentation); the next save from the page reformats it');
  const counts = `${spec.acceptanceCriteria.length} ACs, ${spec.rules.length} rules, ${spec.examples.length} examples, ${spec.testCases.length} test cases, ${(spec.data ?? []).length} data items`;
  if (errors.length) {
    failed = true;
    console.error(`${file}: ${errors.length} problem(s)\n- ${errors.join('\n- ')}`);
  } else {
    console.log(`${file}: OK (${counts})`);
  }
  if (warnings.length) console.warn(`${warnings.length} warning(s):\n- ${warnings.join('\n- ')}`);
}
process.exit(failed ? 1 : 0);
