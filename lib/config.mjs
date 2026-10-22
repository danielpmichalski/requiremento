// Finds and reads the project's requiremento.json. The tool never assumes where the data lives: the config says.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const CONFIG_FILE = 'requiremento.json';
export const DEFAULTS = { terms: 'terms/terms.json', specs: 'specs' };

/**
 * Looks for requiremento.json in `from` and then in each parent folder, like package.json.
 * Without one, the defaults apply relative to `from`.
 * @returns {{ root: string, file: string|null, termsPath: string, specsDir: string }}
 */
export function loadConfig(from = process.cwd()) {
  let dir = resolve(from);
  let file = null;
  for (;;) {
    if (existsSync(join(dir, CONFIG_FILE))) { file = join(dir, CONFIG_FILE); break; }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const root = file ? dirname(file) : resolve(from);
  let config = {};
  if (file) {
    try { config = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${file}: ${e.message}`); }
    const unknown = Object.keys(config).filter((k) => k !== '$schema' && !(k in DEFAULTS));
    if (unknown.length) throw new Error(`${file}: unknown key(s) ${unknown.join(', ')} (known: ${Object.keys(DEFAULTS).join(', ')})`);
    for (const k of Object.keys(DEFAULTS)) if (k in config && typeof config[k] !== 'string') throw new Error(`${file}: "${k}" must be a path (string)`);
  }
  return {
    root,
    file,
    termsPath: resolve(root, config.terms ?? DEFAULTS.terms),
    specsDir: resolve(root, config.specs ?? DEFAULTS.specs),
  };
}
