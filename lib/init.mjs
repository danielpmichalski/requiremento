// The `specky init` and `specky new` commands: start a project, and start a spec in it.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_FILE, DEFAULTS, loadConfig } from './config.mjs';

const { serialize } = createRequire(import.meta.url)('./specs-lib.js');
const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => relative(process.cwd(), p) || '.';
const json = (o) => JSON.stringify(o, null, 2) + '\n';

/** Path of a packaged schema as seen from the data file, with forward slashes. */
const schemaRef = (file, name) => relative(dirname(file), join(pkg, 'schemas', name)).split('\\').join('/');

function write(file, text) {
  if (existsSync(file)) { console.log(`Kept ${rel(file)} (exists).`); return; }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  console.log(`Created ${rel(file)}`);
}

/** Creates specky.json and an empty terms file in the current folder. Existing files are kept. */
export function runInit() {
  const config = loadConfig();
  const root = config.file ? config.root : process.cwd();
  write(join(root, CONFIG_FILE), json(DEFAULTS));
  const termsPath = config.file ? config.termsPath : resolve(root, DEFAULTS.terms);
  write(termsPath, json({ $schema: schemaRef(termsPath, 'terms.schema.json'), groups: [], terms: [], questions: [], changelog: [] }));
  console.log('Next: specky new <KEY> "<title>", then specky serve.');
  return 0;
}

/** Creates an empty spec file for a ticket in the specs folder. */
export function runNew(args) {
  const [key, ...title] = args;
  if (!key || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(key)) { console.error('Usage: specky new <KEY> ["title"]   (KEY is the ticket key, for example SHOP-42)'); return 1; }
  const config = loadConfig();
  const file = join(config.specsDir, `${key}.json`);
  if (existsSync(file)) { console.error(`${rel(file)} exists already.`); return 1; }
  const today = new Date().toISOString().slice(0, 10);
  const name = title.join(' ') || key;
  const spec = {
    $schema: schemaRef(file, 'specs.schema.json'),
    meta: { key, title: name, fullTitle: name, version: '0.1', date: today, status: 'Draft', approvedBy: '', approvedOn: '', related: [], precedence: '' },
    sections: [], terms: [], dataKinds: [], data: [], stories: [], ruleGroups: [], rules: [], examples: [], acceptanceCriteria: [], testCases: [],
    limitations: [], assumptions: [], risks: [], questions: [], decisions: [], withdrawn: [], changelog: [],
  };
  write(file, serialize(spec));
  console.log(`Open it with: specky serve  (then ${basename(file)})`);
  return 0;
}
