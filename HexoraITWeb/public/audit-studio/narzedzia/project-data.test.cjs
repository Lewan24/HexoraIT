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

const {
  indicators, findingFromQuestion, newProject, migrateProject, normalizeV3, normalizeWorkspace, learningProgram
} = sandbox.window.AUDIT_PROJECT_DATA;
sandbox.structuredClone = structuredClone;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/templates-data.js'), 'utf8'), sandbox);
const starter = sandbox.window.AUDIT_TEMPLATES.templates[0];

test('migracja 2 → 3 zachowuje konfigurację, plan, macierz, rejestry, treść raportu i licznik', () => {
  const raw = {
    schema:2, config:{name:'Wersja 2',scope:'Konta i poczta',criterionManual:{'C-01':{mode:'exclude',reason:'Inna spółka'}}},
    tasks:{P01:{status:'done',assessment:'partial',notes:'Jedno konto',checks:[true,false,true]}},
    requirements:{'C-01':{status:'nonconform',applicability:'yes',evidence:'E-011'}},
    evidence:[{id:'E-011',title:'Wynik przeglądu',date:'2026-11-25'}],
    findings:[{id:'U-011',evidence:'E-011',owner:'Opiekun',due:'2026-12-05'}],
    report:{summary:'Wynik audytu',appendix:false}, changesSinceExport:19
  };
  const original=JSON.stringify(raw);
  const migrated=migrateProject(raw,normalize,'projekt-1');
  const migratedPayload=Object.fromEntries(Object.keys(normalize(raw)).map(key=>[key,migrated[key]]));
  assert.deepEqual(migratedPayload,{...normalize(raw),schema:3});
  assert.equal(migrated.mode,'auditor');
  assert.equal(migrated.learning.selected,null);
  assert.equal(JSON.stringify(raw),original);
});

test('odczyt schematu 3 zachowuje migawkę szablonu, powiązania i wskazany projekt', () => {
  const first=newProject(defaults(),'projekt-1');
  const second=newProject(defaults(),'projekt-2','auditor');
  first.learning.selected='BAZ-1';
  first.learning.programs['BAZ-1']=learningProgram(starter);
  first.learning.consent='ZG-01';
  first.auditDate='2026-11-26';
  first.learning.step=4;
  const question=first.learning.programs['BAZ-1'].template.questions[0];
  question.question='Własna migawka starszej treści';
  assert.notEqual(starter.questions[0].question,question.question);
  const answer={status:'partial',evidence:'E-221',note:'Brakuje dwóch pozycji.'};
  first.learning.programs['BAZ-1'].answers[question.id]=answer;
  first.findings=[findingFromQuestion(question,answer,'U-011')];
  const raw=JSON.parse(JSON.stringify({schema:3,revision:12,activeId:second.id,projects:[first,second]}));
  const reloaded=normalizeWorkspace(raw,normalize);
  assert.equal(reloaded.revision,12);
  assert.equal(reloaded.activeId,second.id);
  assert.equal(reloaded.projects[0].learning.programs['BAZ-1'].template.questions[0].question,question.question);
  assert.deepEqual({...reloaded.projects[0].learning.programs['BAZ-1'].answers[question.id]},answer);
  assert.equal(reloaded.projects[0].findings[0].questionId,question.id);
  assert.equal(reloaded.projects[0].learning.consent,'ZG-01');
  assert.equal(reloaded.projects[0].auditDate,'2026-11-26');
  assert.equal(reloaded.projects[0].learning.step,4);
});

test('odczyt schematu 3 odrzuca niespójny indeks i szablon bez uprawnienia odczytu', () => {
  const project=newProject(defaults(),'projekt-1');
  assert.throws(()=>normalizeWorkspace({schema:3,revision:0,activeId:'brak',projects:[project]},normalize));
  assert.throws(()=>normalizeWorkspace({schema:3,revision:0,activeId:project.id,projects:[project,project]},normalize));
  project.learning.selected='BAZ-1';
  const program=learningProgram(starter);
  project.learning.programs['BAZ-1']=program;
  program.template.questions[0].permission='write';
  assert.throws(()=>normalizeV3(project,normalize),/Nieprawidłowe pytanie/);
  program.template.questions[0].permission='read';
  const id=program.template.questions[0].id;
  program.answers[id]={status:'notapp',note:'',evidence:'E-001'};
  assert.equal(normalizeV3(project,normalize).learning.programs['BAZ-1'].answers[id].status,'unassessed');
});

test('wynik zachowuje pytania nieocenione w mianowniku i pomija N/D', () => {
  const values=['conform','partial','nonconform','unassessed','notapp'];
  assert.deepEqual({...indicators(values)},{
    eligible:4,assessed:3,excluded:1,unassessed:1,points:1.5,percent:38
  });
  assert.equal(indicators(['conform',...Array(9).fill('unassessed')]).percent,10);
  assert.equal(indicators(['nonconform','notapp']).percent,0);
  for(const unanswered of [[],['notapp'],['unassessed','notapp']]){
    assert.equal(indicators(unanswered).percent,null);
  }
});

test('ustalenie używa oceny, dowodu, rekomendacji i wagi pytania', () => {
  const question=starter.questions.find(item=>item.risk==='wysokie');
  const answer={status:'partial',note:'W próbie brak potwierdzenia.',evidence:'E-008'};
  const finding=findingFromQuestion(question,answer,'U-007');
  assert.equal(finding.id,'U-007');
  assert.equal(finding.questionId,question.id);
  assert.equal(finding.observation,'Częściowo — W próbie brak potwierdzenia.');
  assert.equal(finding.evidence,'E-008');
  assert.equal(finding.action,question.recommendation);
  assert.equal(finding.likelihood*finding.impact,16);
  assert.equal(findingFromQuestion(question,{...answer,status:'conform'},'U-008'),null);
  assert.equal(findingFromQuestion(question,{...answer,status:'unassessed'},'U-008'),null);
});
