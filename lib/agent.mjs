// What AI agents need to work with requiremento files: the guide, the schemas, and a pointer in the project's instruction file.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMAS = ['requirements', 'terms'];
const START = '<!-- requiremento:start -->';
const END = '<!-- requiremento:end -->';

const SECTION = `${START}
## Requirements (requiremento)

Requirements live in JSON files: a terms file and one requirements file per ticket. \`requiremento.json\` says where. Before you
read or edit them, run \`npx requiremento guide\`. After every edit, run \`npx requiremento check\`.
${END}
`;

/** Prints the guide for AI agents. */
export function runGuide() {
  process.stdout.write(readFileSync(join(pkg, 'lib', 'guide.md'), 'utf8'));
  return 0;
}

/** Prints the JSON Schema of the requirements or the terms file. */
export function runSchema(args) {
  const [name] = args;
  if (!SCHEMAS.includes(name)) { console.error(`Usage: requiremento schema <${SCHEMAS.join('|')}>`); return 1; }
  process.stdout.write(readFileSync(join(pkg, 'schemas', `${name}.schema.json`), 'utf8'));
  return 0;
}

const CHOICES = { agents: ['AGENTS.md'], claude: ['CLAUDE.md'], both: ['AGENTS.md', 'CLAUDE.md'], none: [] };

/**
 * Finds out which instruction files get the requiremento section: the --agents value (agents, claude, both, none),
 * else a question in a terminal, else none.
 */
export async function chooseAgentFiles(args, root) {
  const i = args.indexOf('--agents');
  if (i !== -1) {
    const choice = args[i + 1];
    if (!CHOICES[choice]) throw new Error('--agents takes one of: ' + Object.keys(CHOICES).join(', '));
    return CHOICES[choice];
  }
  if (!process.stdin.isTTY) return null;
  const claudeOnly = existsSync(join(root, 'CLAUDE.md')) && !existsSync(join(root, 'AGENTS.md'));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(
    'Tell AI agents how to work with the requirements? Adds a short section to\n'
    + '  1) AGENTS.md (Codex, Cursor, Copilot, ...)\n  2) CLAUDE.md (Claude Code)\n  3) both\n  4) neither\n'
    + `Choose 1-4 [${claudeOnly ? 2 : 1}]: `)).trim();
  rl.close();
  const pick = { '': claudeOnly ? 'claude' : 'agents', 1: 'agents', 2: 'claude', 3: 'both', 4: 'none' }[answer];
  if (!pick) throw new Error(`"${answer}" is not 1, 2, 3 or 4.`);
  return CHOICES[pick];
}

/** Adds the requiremento section to an instruction file in the folder (creates the file, or replaces an earlier section). */
export function writeAgentSection(root, name) {
  const file = join(root, name);
  const old = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const a = old.indexOf(START);
  const b = old.indexOf(END);
  let text;
  if (a !== -1 && b > a) text = old.slice(0, a) + SECTION.trimEnd() + old.slice(b + END.length);
  else text = old ? old.replace(/\n*$/, '\n\n') + SECTION : SECTION;
  if (text === old) { console.log(`Kept ${name} (requiremento section is current).`); return; }
  writeFileSync(file, text);
  console.log(old ? `Updated ${name} (requiremento section).` : `Created ${name}`);
}
