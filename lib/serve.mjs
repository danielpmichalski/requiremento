// The `requiremento serve` command: a local web server that shows the packaged pages on the project's data.
//   /                 index of the terms and the requirements
//   /requirements.html       /terms.html   the pages (from the package)
//   /terms.json       the project's terms file
//   /<NAME>.json      a requirements file of the project's requirements folder
// The server only reads. Saving is done by the pages (File System Access API or download).
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRequirementsFiles } from './check.mjs';
import { loadConfig } from './config.mjs';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Maps a request path to a file on disk, or null. Only known names are served, never a free path. */
function resolveFile(config, path) {
  const name = decodeURIComponent(path).slice(1);
  if (name === 'requirements.html' || name === 'terms.html') return join(pkg, 'pages', name);
  if (name === 'lib/requirements-lib.js') return join(pkg, 'lib', 'requirements-lib.js');
  if (/^schemas\/(requirements|terms)\.schema\.json$/.test(name)) return join(pkg, name);
  if (name === 'terms.json') return config.termsPath;
  if (/^[\w.-]+\.json$/.test(name)) return listRequirementsFiles(config.requirementsDir).find((f) => basename(f) === name) ?? null;
  return null;
}

function indexPage(config) {
  const files = listRequirementsFiles(config.requirementsDir).map((f) => basename(f));
  const li = (href, label) => `<li><a href="${esc(href)}">${esc(label)}</a></li>`;
  return `<!doctype html><meta charset="utf-8"><title>Requiremento</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem}</style>
<h1>Requiremento</h1>
<h2>Terms</h2><ul>${existsSync(config.termsPath) ? li('/terms.html', basename(config.termsPath)) : '<li>No terms file yet.</li>'}</ul>
<h2>Requirements</h2><ul>${files.map((n) => li(`/requirements.html?file=${encodeURIComponent(n)}`, n)).join('') || '<li>No requirements files yet.</li>'}</ul>`;
}

/** Starts the server and keeps running. */
export function runServe(args) {
  const i = args.indexOf('--port');
  const port = i >= 0 ? Number(args[i + 1]) : 8000;
  if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error('--port needs a number from 0 to 65535.'); return 1; }
  const config = loadConfig();
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    if (path === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(indexPage(config)); return; }
    let file = null;
    try { file = resolveFile(config, path); } catch { /* malformed escape: not found */ }
    if (!file || !existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
    res.writeHead(200, { 'content-type': `${TYPES[file.slice(file.lastIndexOf('.'))] ?? 'application/octet-stream'}; charset=utf-8`, 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
  });
  server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} is in use. Try --port ${port + 1}.` : e.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Requiremento at http://localhost:${server.address().port}/  (Ctrl+C to stop)`));
  return null;
}
