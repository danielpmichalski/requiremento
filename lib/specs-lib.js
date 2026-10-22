// Shared by specs.html (loaded as a classic script, also from file://) and check.mjs (loaded as CommonJS).
// Knows the collections of a spec file, serializes it in a stable key order and checks it.
(function (root) {
  'use strict';

  /** Key order of every object, as in specs.schema.json. Optional keys are written only when present. */
  const ORDER = {
    meta: ['key', 'title', 'fullTitle', 'version', 'date', 'status', 'approvedBy', 'approvedOn', 'related', 'precedence'],
    related: ['label', 'path'],
    sections: ['id', 'title', 'body', 'list?', 'after?'],
    dataKinds: ['id', 'label', 'title', 'columns', 'derived?'],
    derived: ['title', 'kind', 'column'],
    data: ['id', 'kind', 'values', 'testOnly?'],
    stories: ['id', 'title', 'text', 'setup', 'readiness'],
    ruleGroups: ['id', 'title', 'story', 'note'],
    rules: ['id', 'group', 'statement'],
    examples: ['id', 'rule', 'text'],
    acceptanceCriteria: ['id', 'story', 'title', 'status', 'statusNote', 'rules', 'examples', 'description', 'scenarios', 'notes'],
    testCases: ['id', 'title', 'acs', 'status', 'steps', 'automation', 'notes'],
    limitations: ['id', 'title', 'text', 'affects', 'followUp'],
    assumptions: ['id', 'text', 'affects'],
    risks: ['id', 'text', 'likelihood', 'impact', 'acs', 'testApproach'],
    questions: ['id', 'text', 'blocks', 'askedTo', 'status', 'resolution'],
    decisions: ['date', 'text', 'refs'],
    withdrawn: ['ids', 'reason'],
    changelog: ['date', 'author', 'action', 'ref', 'summary'],
  };
  /** Collections whose items carry a stable ID such as AC-09a. */
  const ID_COLLECTIONS = ['stories', 'rules', 'examples', 'acceptanceCriteria', 'testCases', 'limitations', 'assumptions', 'risks', 'questions'];
  /** Text fields per collection, used for search, ID mentions and term links. */
  const TEXT_FIELDS = {
    stories: ['title', 'text', 'setup', 'readiness'],
    ruleGroups: ['title', 'note'],
    rules: ['statement'],
    examples: ['text'],
    acceptanceCriteria: ['title', 'statusNote', 'description', 'scenarios', 'notes'],
    testCases: ['title', 'steps', 'notes'],
    limitations: ['title', 'text', 'followUp'],
    assumptions: ['text'],
    risks: ['text', 'testApproach'],
    questions: ['text', 'blocks', 'resolution'],
    decisions: ['text'],
    withdrawn: ['reason'],
    sections: ['body', 'after'],
  };
  /** Structured references: field -> collections the id must be in. */
  const REF_FIELDS = {
    ruleGroups: { story: ['stories'] },
    rules: { group: ['ruleGroups'] },
    examples: { rule: ['rules'] },
    acceptanceCriteria: { story: ['stories'], rules: ['rules'], examples: ['examples'] },
    testCases: { acs: ['acceptanceCriteria'] },
    limitations: { affects: ID_COLLECTIONS },
    assumptions: { affects: ID_COLLECTIONS },
    risks: { acs: ['acceptanceCriteria'] },
    decisions: { refs: ID_COLLECTIONS },
  };
  const AC_STATUSES = [
    { id: 'draft', label: 'Draft' },
    { id: 'pending', label: 'Not yet implemented' },
    { id: 'implemented', label: 'Implemented' },
    { id: 'known-limitation', label: 'Known limitation' },
    { id: 'target', label: 'Non-binding target' },
  ];
  const LISTS = ['meta', 'terms', 'data', 'rules', 'acceptanceCriteria', 'testCases', 'limitations', 'assumptions', 'risks', 'traceability',
    'questions', 'decisions', 'withdrawn'];
  const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  const ID = /^[A-Z]+(-[A-Z]+)*-[0-9]+[a-z]?$/;
  /** ID of a reference data item, e.g. MEM-1, BK-2, CP-3a1 or MX. */
  const DATA_ID = /^[A-Z][A-Z0-9]*(-[A-Za-z0-9]+)*$/;
  const TERM_LINK = /\[\[([^\]|]+)(?:\|[^\]]*)?]]/g;

  const asArray = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
  const ordered = (obj, keys) => {
    const o = {};
    for (const k of keys) {
      const optional = k.endsWith('?');
      const key = optional ? k.slice(0, -1) : k;
      if (optional && (obj[key] === undefined || obj[key] === '' || obj[key] === false || (Array.isArray(obj[key]) && !obj[key].length))) continue;
      o[key] = obj[key] ?? (Array.isArray(obj[key]) ? [] : '');
    }
    return o;
  };

  /** Same key order and formatting for every writer, so diffs only show real changes. */
  function serialize(spec) {
    const out = { $schema: spec.$schema ?? '../schemas/specs.schema.json' };
    out.meta = ordered({ ...spec.meta, related: (spec.meta.related ?? []).map((r) => ordered(r, ORDER.related)) }, ORDER.meta);
    out.sections = spec.sections.map((s) => ordered(s, ORDER.sections));
    out.terms = [...spec.terms];
    out.dataKinds = (spec.dataKinds ?? []).map((k) => ordered({ ...k, derived: (k.derived ?? []).map((d) => ordered(d, ORDER.derived)) }, ORDER.dataKinds));
    const columnsOf = new Map((spec.dataKinds ?? []).map((k) => [k.id, k.columns]));
    out.data = (spec.data ?? []).map((d) => {
      // Values in the column order of the kind, empty ones left out.
      const cols = columnsOf.get(d.kind) ?? [];
      const keys = [...cols, ...Object.keys(d.values ?? {}).filter((c) => !cols.includes(c))];
      const values = {};
      for (const c of keys) if (d.values?.[c]) values[c] = d.values[c];
      return ordered({ ...d, values }, ORDER.data);
    });
    for (const c of ['stories', 'ruleGroups', 'rules', 'examples', 'acceptanceCriteria', 'testCases', 'limitations', 'assumptions',
      'risks', 'questions', 'decisions', 'withdrawn', 'changelog']) {
      out[c] = (spec[c] ?? []).map((x) => ordered(x, ORDER[c]));
    }
    return JSON.stringify(out, null, 2) + '\n';
  }

  /** "F-LOAN-01..F-LOAN-42" -> F-LOAN-01 ... F-LOAN-42; anything else unchanged. */
  function expandIds(ids) {
    const out = [];
    for (const x of ids) {
      const m = x.match(/^(.*?)(\d+)\.\.(.*?)(\d+)$/);
      if (m && m[1] === m[3]) for (let n = +m[2]; n <= +m[4]; n++) out.push(m[1] + String(n).padStart(m[2].length, '0'));
      else out.push(x);
    }
    return out;
  }

  /** Map of every ID to its item: { id: { collection, item } }. */
  function indexIds(spec) {
    const index = new Map();
    for (const c of ID_COLLECTIONS) for (const item of spec[c] ?? []) if (!index.has(item.id)) index.set(item.id, { collection: c, item });
    return index;
  }
  const withdrawnIds = (spec) => new Set(expandIds((spec.withdrawn ?? []).flatMap((w) => w.ids)));

  /** Regex that finds mentions of the spec's IDs in text, e.g. AC-09a or RULE-LOAN-33. */
  function idPattern(spec) {
    const prefixes = new Set();
    for (const id of [...indexIds(spec).keys(), ...withdrawnIds(spec)]) prefixes.add(id.replace(/\d+[a-z]?$/, ''));
    if (!prefixes.size) return null;
    const alt = [...prefixes].sort((a, b) => b.length - a.length).map((p) => p.replace(/[-]/g, '\\-')).join('|');
    return new RegExp(`(?<![\\w-])((?:${alt})\\d+[a-z]?)(?![\\w-])`, 'g');
  }

  /**
   * Regex that finds mentions of reference data items, e.g. BK-2 or MEM-1. Besides the known IDs it matches
   * unknown ones with a known prefix (CP-9 when CP-1 exists), so broken mentions can be reported.
   */
  function dataPattern(spec) {
    const ids = (spec.data ?? []).map((d) => d.id).filter((id) => DATA_ID.test(id));
    if (!ids.length) return null;
    const prefixes = new Set(ids.filter((id) => id.includes('-')).map((id) => id.slice(0, id.lastIndexOf('-') + 1)));
    const quote = (x) => x.replace(/[-]/g, '\\-');
    const known = ids.sort((a, b) => b.length - a.length).map(quote).join('|');
    const pfx = [...prefixes].sort((a, b) => b.length - a.length).map(quote).join('|');
    return new RegExp(`(?<![\\w-])(${known}${pfx ? `|(?:${pfx})[A-Za-z0-9]+` : ''})(?![\\w-])`, 'g');
  }

  /** Every text of the spec with its owner: [{ ref, collection, field, text }]. */
  function texts(spec) {
    const out = [];
    const push = (ref, collection, field, v) => { for (const t of asArray(v)) if (typeof t === 'string' && t) out.push({ ref, collection, field, text: t }); };
    push('', 'meta', 'precedence', spec.meta?.precedence);
    for (const d of spec.data ?? []) for (const [col, v] of Object.entries(d.values ?? {})) push(d.id, 'data', col, v);
    for (const [c, fields] of Object.entries(TEXT_FIELDS)) {
      (spec[c] ?? []).forEach((item, i) => {
        const ref = item.id ?? (c === 'decisions' ? `decision ${item.date} #${i + 1}` : `${c} #${i + 1}`);
        for (const f of fields) push(ref, c, f, item[f]);
      });
    }
    return out;
  }

  const mentions = (text, re) => (re ? [...text.matchAll(re)].map((m) => m[1]) : []);
  const termLinks = (text) => [...String(text ?? '').matchAll(TERM_LINK)].map((m) => m[1].trim());

  /** For every ID (also of reference data items), the items that refer to it, by structured field or in text: Map id -> [ref]. */
  function referencedBy(spec) {
    const re = idPattern(spec);
    const dataRe = dataPattern(spec);
    const by = new Map();
    const add = (target, from) => {
      if (!from || target === from) return;
      if (!by.has(target)) by.set(target, []);
      if (!by.get(target).includes(from)) by.get(target).push(from);
    };
    for (const [c, fields] of Object.entries(REF_FIELDS)) {
      for (const item of spec[c] ?? []) for (const f of Object.keys(fields)) for (const id of asArray(item[f])) add(id, item.id ?? '');
    }
    for (const t of texts(spec)) {
      if (t.collection === 'sections' || t.collection === 'decisions') continue;
      for (const id of [...mentions(t.text, re), ...mentions(t.text, dataRe)]) add(id, t.ref);
    }
    return by;
  }

  /**
   * Checks what the JSON Schema can't express. Errors block saving; warnings don't.
   * @param spec parsed spec file
   * @param terms parsed terms.json, or null when it isn't loaded
   */
  function check(spec, terms) {
    const errors = [];
    const warnings = [];
    const ids = new Map();
    const withdrawn = withdrawnIds(spec);
    for (const c of ID_COLLECTIONS) {
      for (const item of spec[c] ?? []) {
        if (!ID.test(item.id ?? '')) errors.push(`${c}: id "${item.id}" is not an ID such as AC-01 or RULE-LOAN-03`);
        if (ids.has(item.id)) errors.push(`duplicate id "${item.id}" (${ids.get(item.id)} and ${c})`);
        else ids.set(item.id, c);
        if (withdrawn.has(item.id)) errors.push(`"${item.id}" is withdrawn and must not be reused`);
      }
    }
    const groups = new Set((spec.ruleGroups ?? []).map((g) => g.id));
    const sectionIds = new Set();
    for (const s of spec.sections ?? []) {
      if (!SLUG.test(s.id)) errors.push(`section "${s.title}": id "${s.id}" is not a lowercase slug`);
      if (sectionIds.has(s.id)) errors.push(`duplicate section id "${s.id}"`);
      sectionIds.add(s.id);
      if (s.list && !LISTS.includes(s.list)) errors.push(`section "${s.id}": unknown list "${s.list}"`);
    }
    for (const l of LISTS) {
      if (Array.isArray(spec[l]) && spec[l].length && !(spec.sections ?? []).some((s) => s.list === l)) {
        warnings.push(`${spec[l].length} item(s) of "${l}" are not shown: no section has list "${l}"`);
      }
    }
    const kinds = new Map();
    for (const k of spec.dataKinds ?? []) {
      if (!SLUG.test(k.id ?? '')) errors.push(`data kind "${k.title}": id "${k.id}" is not a lowercase slug`);
      if (kinds.has(k.id)) errors.push(`duplicate data kind "${k.id}"`);
      kinds.set(k.id, k);
      if (!k.columns?.length) errors.push(`data kind "${k.id}": no columns`);
      if (new Set(k.columns).size !== (k.columns ?? []).length) errors.push(`data kind "${k.id}": duplicate column`);
    }
    for (const k of kinds.values()) {
      for (const d of k.derived ?? []) {
        const target = kinds.get(d.kind);
        if (!target) errors.push(`data kind "${k.id}": derived column "${d.title}" refers to unknown kind "${d.kind}"`);
        else if (!target.columns.includes(d.column)) errors.push(`data kind "${k.id}": derived column "${d.title}" refers to unknown column "${d.column}" of "${d.kind}"`);
      }
    }
    const dataIds = new Set();
    const specRe = idPattern(spec);
    for (const d of spec.data ?? []) {
      if (!DATA_ID.test(d.id ?? '')) errors.push(`data: id "${d.id}" is not an ID such as MEM-1, BK-2 or CP-3a1`);
      if (dataIds.has(d.id)) errors.push(`duplicate data id "${d.id}"`);
      dataIds.add(d.id);
      if (ids.has(d.id) || withdrawn.has(d.id) || mentions(d.id, specRe).length) errors.push(`data id "${d.id}" looks like an ID of the spec (${ids.get(d.id) ?? 'pattern'})`);
      const k = kinds.get(d.kind);
      if (!k) errors.push(`${d.id}: unknown data kind "${d.kind}"`);
      else for (const col of Object.keys(d.values ?? {})) if (!k.columns.includes(col)) errors.push(`${d.id}: "${col}" is not a column of ${k.id}`);
    }
    const inCollections = (id, cs) => cs.some((c) => c === 'ruleGroups' ? groups.has(id) : ids.get(id) === c);
    for (const [c, fields] of Object.entries(REF_FIELDS)) {
      for (const item of spec[c] ?? []) {
        for (const [f, targets] of Object.entries(fields)) {
          for (const id of asArray(item[f])) {
            if (c === 'ruleGroups' && f === 'story' && !id) continue;
            if (inCollections(id, targets)) continue;
            if (c === 'decisions' && withdrawn.has(id)) continue;
            errors.push(`${item.id ?? c + ' ' + (item.date ?? '')}: ${f} refers to ${withdrawn.has(id) ? 'withdrawn' : 'unknown'} "${id}"`);
          }
        }
      }
    }
    for (const a of spec.acceptanceCriteria ?? []) {
      if (!AC_STATUSES.some((s) => s.id === a.status)) errors.push(`${a.id}: unknown status "${a.status}"`);
      if (!a.scenarios?.length && !a.description?.trim()) errors.push(`${a.id}: neither scenarios nor a description`);
      for (const sc of a.scenarios ?? []) if (!/^Scenario( Outline)?:/.test(sc)) errors.push(`${a.id}: a scenario doesn't start with "Scenario:" or "Scenario Outline:"`);
      const exRules = new Map((spec.examples ?? []).map((e) => [e.id, e.rule]));
      for (const ex of a.examples ?? []) {
        const r = exRules.get(ex);
        if (r && !a.rules.includes(r)) warnings.push(`${a.id}: example ${ex} belongs to ${r}, which is not among its rules`);
      }
    }
    for (const r of spec.rules ?? []) if (!(spec.examples ?? []).some((e) => e.rule === r.id)) errors.push(`${r.id}: rule without an example`);
    for (const e of spec.examples ?? []) if (!(spec.acceptanceCriteria ?? []).some((a) => a.examples.includes(e.id))) errors.push(`${e.id}: example not used by any AC`);
    for (const s of spec.stories ?? []) if (!(spec.acceptanceCriteria ?? []).some((a) => a.story === s.id)) warnings.push(`${s.id}: story without ACs`);
    for (const r of spec.risks ?? []) for (const f of ['likelihood', 'impact']) if (![1, 2, 3].includes(r[f])) errors.push(`${r.id}: ${f} must be 1, 2 or 3`);
    for (const q of spec.questions ?? []) if (q.status === 'resolved' && !q.resolution?.trim()) errors.push(`${q.id}: resolved without a resolution`);

    const re = idPattern(spec);
    const dataRe = dataPattern(spec);
    for (const t of texts(spec)) {
      for (const id of mentions(t.text, re)) {
        if (!ids.has(id) && !withdrawn.has(id)) errors.push(`${t.ref || 'meta'} (${t.field}): mentions unknown "${id}"`);
      }
      for (const id of mentions(t.text, dataRe)) {
        if (!dataIds.has(id)) errors.push(`${t.ref || 'meta'} (${t.field}): mentions unknown data item "${id}"`);
      }
    }
    const refBy = referencedBy(spec);
    // Used: mentioned by an item of the spec, or by a used data item (CP-1 is on BK-4).
    const usedData = new Set();
    for (let grew = true; grew;) {
      grew = false;
      for (const id of dataIds) {
        if (!usedData.has(id) && (refBy.get(id) ?? []).some((r) => !dataIds.has(r) || usedData.has(r))) { usedData.add(id); grew = true; }
      }
    }
    for (const id of dataIds) if (!usedData.has(id)) warnings.push(`data item ${id} is used by no item of the spec, not even through other data items`);
    for (const [i, c] of (spec.changelog ?? []).entries()) {
      if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2}))?$/.test(c.date ?? '')) errors.push(`changelog #${i + 1}: date "${c.date}" is neither a date nor a date and time with UTC offset`);
      if (c.ref && !ids.has(c.ref) && !dataIds.has(c.ref) && !sectionIds.has(c.ref) && !withdrawn.has(c.ref) && c.action !== 'deleted') {
        errors.push(`changelog #${i + 1}: unknown ref "${c.ref}"`);
      }
    }

    // Terms live in the terms file only.
    const used = new Map(); // term id -> where
    for (const id of spec.terms ?? []) used.set(id, 'the terms list');
    for (const t of texts(spec)) for (const id of termLinks(t.text)) if (!used.has(id)) used.set(id, t.ref || t.collection);
    if (!terms) {
      if (used.size) warnings.push(`terms.json is not loaded, so ${used.size} term reference(s) are not checked`);
    } else {
      const byId = new Map(terms.terms.map((t) => [t.id, t]));
      for (const [id, where] of used) {
        const t = byId.get(id);
        if (!t) warnings.push(`term "${id}" (used in ${where}) is missing in terms.json`);
        else if (t.status === 'retired') warnings.push(`term "${id}" (used in ${where}) is retired in terms.json; replaced by ${t.replacedBy}`);
      }
    }
    return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
  }

  const api = { ORDER, ID_COLLECTIONS, TEXT_FIELDS, REF_FIELDS, AC_STATUSES, LISTS, DATA_ID, serialize, expandIds, indexIds, withdrawnIds, idPattern,
    dataPattern, texts, termLinks, referencedBy, check };
  root.SpecLib = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
