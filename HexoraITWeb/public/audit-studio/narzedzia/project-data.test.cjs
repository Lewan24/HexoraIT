'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/project-data.js'), 'utf8'), sandbox);
const { normalizeProject, dateOnly, risk } = sandbox.window.AUDIT_PROJECT_DATA;
const defaults = () => ({
  schema: 2, config: { name: '', manual: {}, criterionManual: {}, tech: { cloud: false } },
  tasks: {}, requirements: {}, report: { appendix: true }
});
const normalize = value => normalizeProject(value, defaults, new Set(['P01']), new Set(['C-01']), () => ({}));

test('przyjmuje schemat 2 i zachowuje tekst oraz odwołania w poprawnym projekcie', () => {
  const longText = 'a'.repeat(33000);
  const input = {
    schema: 2, config: { name: 'Przegląd', scope: longText, manual: { P01: 'exclude' } },
    tasks: { P01: { status: 'done', assessment: 'partial', notes: '<img src=x>' } },
    requirements: { 'C-01': { status: 'conform', applicability: 'yes', evidence: 'E-001' } },
    evidence: [{ id: 'E-001', date: '2024-02-29' }],
    findings: [{ id: 'U-001', status: 'closed', due: '2026-11-26', evidence: 'E-001' }],
    report: { appendix: false, summary: longText, conclusion: 'limited' },
    updated: '2026-11-26T10:00:00.000Z', changesSinceExport: 4
  };
  const value = normalize(input);
  assert.equal(value.config.scope, longText);
  assert.equal(value.config.manual.P01, 'exclude');
  assert.equal(value.tasks.P01.notes, '<img src=x>');
  assert.equal(value.tasks.P01.assessment, 'partial');
  assert.equal(value.requirements['C-01'].evidence, 'E-001');
  assert.equal(value.evidence[0].date, '2024-02-29');
  assert.equal(value.findings[0].due, '2026-11-26');
  assert.equal(value.report.summary, longText);
  assert.equal(value.report.appendix, false);
  assert.equal(value.updated, input.updated);
  assert.equal(value.changesSinceExport, 4);
});

test('sprawdza statusy w kontekście ich pól, zastosowanie, skalę ryzyka i kalendarz', () => {
  const value = normalize({
    schema: 2, tasks: { P01: { status: 'conform', assessment: 'done', verified: 'false', checks: [true, 'false'] } },
    requirements: { 'C-01': { status: 'accepted', applicability: 'maybe' } },
    evidence: [{ date: '2025-02-29' }],
    findings: [{ likelihood: -3, impact: '9', due: '2026-04-31', status: 'partial' }],
    report: { conclusion: 'corrupt' }, updated: '2025-02-29T10:00:00Z', changesSinceExport: -40
  });
  assert.equal(value.tasks.P01.status, 'new');
  assert.equal(value.tasks.P01.assessment, 'unassessed');
  assert.equal(value.tasks.P01.verified, false);
  assert.deepEqual([...value.tasks.P01.checks], [true, false, false]);
  assert.equal(value.requirements['C-01'].status, 'unassessed');
  assert.equal(value.requirements['C-01'].applicability, 'pending');
  assert.equal(value.evidence[0].date, '');
  assert.equal(value.findings[0].status, 'open');
  assert.equal(value.findings[0].likelihood, 1);
  assert.equal(value.findings[0].impact, 5);
  assert.equal(value.findings[0].due, '');
  assert.equal(value.updated, null);
  assert.equal(value.changesSinceExport, 0);
  assert.equal(value.report.conclusion, 'none');
  assert.equal(dateOnly('0000-01-01'), '');
  assert.equal(risk('x'), 3);
  assert.equal(risk(null), 3);
});

test('zachowuje wszystkie rekordy i nadaje wolne identyfikatory przy duplikatach i brakach', () => {
  const value = normalize({
    schema: 2, evidence: [{ id: 'e-002', title: 'A' }, { id: 'E-002', title: 'B' }, { id: 'E-001' }, {}],
    findings: [{ id: 'U-001' }, { id: 'u-001', evidence: 'e-002' }]
  });
  assert.deepEqual(Array.from(value.evidence, item => item.id), ['e-002', 'E-003', 'E-001', 'E-004']);
  assert.equal(value.evidence[1].title, 'B');
  assert.deepEqual(Array.from(value.findings, item => item.id), ['U-001', 'U-002']);
  assert.equal(value.findings[1].evidence, 'e-002');
});

test('odrzuca zły schemat i uszkodzone sekcje, ignoruje klucze spoza katalogu', () => {
  for (const value of [null, [], { schema: 1 }, { schema: 2, report: [] },
    { schema: 2, tasks: { P01: null } }, { schema: 2, findings: [null] }])
    assert.throws(() => normalize(value));

  const value = normalize(JSON.parse('{"schema":2,"tasks":{"constructor":{"status":"done"},"__proto__":{"intrusion":true}},"config":{"manual":{"__proto__":"include"}}}'));
  assert.deepEqual(Object.keys(value.tasks), []);
  assert.deepEqual(Object.keys(value.config.manual), []);
  assert.equal({}.intrusion, undefined);
});
