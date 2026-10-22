#!/usr/bin/env node
// Command line of requiremento: init, new, check, serve.
import { readFileSync } from 'node:fs';
import { runGuide, runSchema } from '../lib/agent.mjs';
import { runCheck } from '../lib/check.mjs';
import { runInit, runNew } from '../lib/init.mjs';
import { runServe } from '../lib/serve.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const HELP = `requiremento ${version}: living requirements as JSON

Usage: requiremento <command>

  init [--agents agents|claude|both|none]
                        create requiremento.json and an empty terms file here; asks whether to add
                        a short section for AI agents to AGENTS.md and/or CLAUDE.md
  guide                 print the guide for AI agents (formats and rules)
  schema <requirements|terms>  print a JSON Schema
  new <KEY> ["title"]   create an empty requirements file for a ticket
  check [file.json ...] check the terms and the requirements files (all by default); exit code 1 on errors
  serve [--port 8000]   show and edit them in the browser
  --version, --help

requiremento.json (found in this or a parent folder) says where the data lives:
  { "terms": "terms/terms.json", "requirements": "requirements" }
`;

const [command, ...args] = process.argv.slice(2);
try {
  let code;
  switch (command) {
    case 'init': code = await runInit(args); break;
    case 'new': code = runNew(args); break;
    case 'check': code = runCheck(args); break;
    case 'serve': code = runServe(args); break;
    case 'guide': code = runGuide(); break;
    case 'schema': code = runSchema(args); break;
    case '--version': case '-v': console.log(version); code = 0; break;
    case undefined: case '--help': case '-h': case 'help': console.log(HELP); code = 0; break;
    default: console.error(`Unknown command "${command}".\n\n${HELP}`); code = 1;
  }
  if (code !== null) process.exitCode = code;
} catch (e) {
  console.error(`requiremento: ${e.message}`);
  process.exitCode = 1;
}
