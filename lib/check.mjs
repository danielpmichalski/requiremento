// The `requiremento check` command: checks the terms file and the spec files named in requiremento.json.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { checkTerms } from './check-terms.mjs';
import { loadConfig } from './config.mjs';

const { check, serialize } = createRequire(import.meta.url)('./specs-lib.js');
const rel = (p) => relative(process.cwd(), p) || '.';

/** Every JSON file in `dir` that declares the specs schema. */
export function listSpecFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => join(dir, f))
    .filter((f) => /specs\.schema\.json$/.test(JSON.parse(readFileSync(f, 'utf8')).$schema ?? ''));
}

/**
 * Checks the terms file and the given spec files (default: all of them in the specs folder).
 * @returns {number} the exit code: 1 if any file has errors, else 0
 */
export function runCheck(args) {
  const config = loadConfig();
  let failed = false;

  let terms = null;
  if (existsSync(config.termsPath)) {
    terms = JSON.parse(readFileSync(config.termsPath, 'utf8'));
    const errors = checkTerms(terms);
    if (errors.length) {
      failed = true;
      console.error(`${rel(config.termsPath)}: ${errors.length} problem(s)\n- ${errors.join('\n- ')}`);
    } else {
      console.log(`${rel(config.termsPath)}: OK (${terms.terms.length} terms, ${terms.questions.length} questions)`);
    }
  } else if (!args.length) {
    console.warn(`No terms file at ${rel(config.termsPath)}; terms are not checked.`);
  }

  const files = args.length ? args : listSpecFiles(config.specsDir);
  if (!files.length) console.warn(`No spec files in ${rel(config.specsDir)}.`);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const spec = JSON.parse(text);
    const { errors, warnings } = check(spec, terms);
    if (serialize(spec) !== text) warnings.push('the file is not in the format specs.html writes (key order or indentation); the next save from the page reformats it');
    const counts = `${spec.acceptanceCriteria.length} ACs, ${spec.rules.length} rules, ${spec.examples.length} examples, ${spec.testCases.length} test cases, ${(spec.data ?? []).length} data items`;
    if (errors.length) {
      failed = true;
      console.error(`${rel(file)}: ${errors.length} problem(s)\n- ${errors.join('\n- ')}`);
    } else {
      console.log(`${rel(file)}: OK (${counts})`);
    }
    if (warnings.length) console.warn(`${warnings.length} warning(s):\n- ${warnings.join('\n- ')}`);
  }
  return failed ? 1 : 0;
}
