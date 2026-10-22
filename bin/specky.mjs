#!/usr/bin/env node
// Command line of specky: init, new, check, serve.
import { readFileSync } from 'node:fs';
import { runCheck } from '../lib/check.mjs';
import { runInit, runNew } from '../lib/init.mjs';
import { runServe } from '../lib/serve.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const HELP = `specky ${version}: living requirements as JSON

Usage: specky <command>

  init                  create specky.json and an empty terms file here
  new <KEY> ["title"]   create an empty spec file for a ticket
  check [spec.json ...] check the terms and the specs (all specs by default); exit code 1 on errors
  serve [--port 8000]   show and edit them in the browser
  --version, --help

specky.json (found in this or a parent folder) says where the data lives:
  { "terms": "terms/terms.json", "specs": "specs" }
`;

const [command, ...args] = process.argv.slice(2);
try {
  let code;
  switch (command) {
    case 'init': code = runInit(); break;
    case 'new': code = runNew(args); break;
    case 'check': code = runCheck(args); break;
    case 'serve': code = runServe(args); break;
    case '--version': case '-v': console.log(version); code = 0; break;
    case undefined: case '--help': case '-h': case 'help': console.log(HELP); code = 0; break;
    default: console.error(`Unknown command "${command}".\n\n${HELP}`); code = 1;
  }
  if (code !== null) process.exitCode = code;
} catch (e) {
  console.error(`specky: ${e.message}`);
  process.exitCode = 1;
}
