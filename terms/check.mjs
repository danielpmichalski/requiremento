#!/usr/bin/env node
// Checks terms.json for problems the JSON Schema can't express: duplicate ids, unknown groups, broken links and order.
// Usage: node terms/check.mjs [path/to/terms.json]
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), 'terms.json');
const data = JSON.parse(readFileSync(file, 'utf8'));
const errors = [];

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const groupIds = new Set(data.groups.map(g => g.id));
const termIds = new Set();
for (const t of data.terms) {
  if (!SLUG.test(t.id)) errors.push(`term "${t.term}": id "${t.id}" is not a lowercase slug`);
  if (termIds.has(t.id)) errors.push(`duplicate term id "${t.id}"`);
  termIds.add(t.id);
  if (!groupIds.has(t.group)) errors.push(`term "${t.id}": unknown group "${t.group}"`);
  for (const f of ['term', 'definition']) if (!t[f]?.trim()) errors.push(`term "${t.id}": ${f} is empty`);
  if (t.status === 'retired' && !t.replacedBy) errors.push(`term "${t.id}": retired without replacedBy`);
}

// Same order as terms.html writes: groups by title, terms by group, then by name.
const byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });
const groupIndex = new Map(data.groups.map((g, i) => [g.id, i]));
for (let i = 1; i < data.groups.length; i++) {
  if (byName(data.groups[i - 1].title, data.groups[i].title) > 0) errors.push(`group "${data.groups[i].id}" is out of order (groups are sorted by title)`);
}
for (let i = 1; i < data.terms.length; i++) {
  const [a, b] = [data.terms[i - 1], data.terms[i]];
  if ((groupIndex.get(a.group) - groupIndex.get(b.group) || byName(a.term, b.term)) > 0) {
    errors.push(`term "${b.id}" is out of order (terms are sorted by group, then by name)`);
  }
}

const links = (text) => [...(text ?? '').matchAll(/\[\[([^\]]+)]]/g)].map(m => m[1]);
for (const t of data.terms) {
  for (const id of links(t.definition)) if (!termIds.has(id)) errors.push(`term "${t.id}": link to unknown term "${id}"`);
}
const questionIds = new Set();
for (const q of data.questions) {
  if (questionIds.has(q.id)) errors.push(`duplicate question id "${q.id}"`);
  questionIds.add(q.id);
  for (const id of [...q.terms, ...links(q.text), ...links(q.resolution)]) {
    if (!termIds.has(id)) errors.push(`question "${q.id}": unknown term "${id}"`);
  }
  if (q.status === 'resolved' && !q.resolution.trim()) errors.push(`question "${q.id}": resolved without resolution`);
}
for (const [i, c] of data.changelog.entries()) {
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2}))?$/.test(c.date ?? '')) errors.push(`changelog #${i + 1}: date "${c.date}" is neither a date nor a date and time with UTC offset`);
  if (c.ref && !termIds.has(c.ref) && !questionIds.has(c.ref) && c.action !== 'deleted') {
    errors.push(`changelog #${i + 1}: unknown ref "${c.ref}"`);
  }
}

if (errors.length) {
  console.error(`${file}: ${errors.length} problem(s)\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`${file}: OK (${data.terms.length} terms, ${data.questions.length} questions)`);
