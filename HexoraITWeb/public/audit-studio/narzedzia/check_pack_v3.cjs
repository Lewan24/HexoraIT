'use strict';

// Zachowuje kontrolę zadań, źródeł, istniejących kryteriów i formularzy.
require('./check_pack_v2.cjs');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const context = vm.createContext({window:{}});
for (const file of ['audit-data','playbook-data','templates-data','demo-data','project-data']) {
  vm.runInContext(read('assets/'+file+'.js'),context,{filename:file+'.js'});
}
const {AUDIT_DATA:original,AUDIT_GUIDE:guide,AUDIT_TEMPLATES:catalog,AUDIT_DEMO:demo} = context.window;
const {results} = context.window.AUDIT_PROJECT_DATA;
const {templates,advanced,upcoming} = catalog;
const taskIds = new Set(original.stages.flatMap(stage=>stage.tasks.map(task=>task.id)));
const sources = new Set(original.sources.map(item=>item.id));
assert.equal(sources.size,original.sources.length,'Zduplikowane identyfikatory źródeł');
for (const criterion of original.criteria) assert.ok(sources.has(criterion.source), 'Brak źródła dla '+criterion.id);
for (const [group,ids] of Object.entries(guide.standards)) {
  for (const id of ids) assert.ok(taskIds.has(id),group+' wskazuje brakujące zadanie '+id);
}

const text = value => typeof value==='string' && Boolean(value.trim());
const unique = (array, label) => assert.equal(new Set(array).size,array.length,label+' zawiera powtórzone identyfikatory');
assert.equal(templates.length,6);
assert.equal(templates.filter(item=>item.level===1).length,1);
assert.equal(templates.filter(item=>item.level===2).length,5);
unique(templates.map(item=>item.id),'Katalog pytań');
const templateFields = ['id','name','description','audience','learning','duration'];
const questionFields = ['id','area','question','why','how','evidence','risk','riskReason','recommendation','reference','permission'];
const allQuestions = [];
const allowedRisk = ['niskie','średnie','wysokie'];
for (const template of templates) {
  for (const field of templateFields) assert.ok(text(template[field]),template.id+' — brak '+field);
  assert.ok(Number.isInteger(template.version)&&template.version>=1,'Niepoprawna wersja '+template.id);
  const count = template.questions.length, starter=template.level===1;
  assert.ok(starter ? count>=40&&count<=50 : count>=20&&count<=30,'Niepoprawna liczba pytań w '+template.id);
  const areas = new Set(template.areas.map(area=>area.id));
  unique(template.areas.map(item=>item.id),template.id+' — obszary');
  for (const area of template.areas) {
    assert.ok(text(area.name)&&template.questions.some(question=>question.area===area.id),'Brak pytania lub nazwy dla '+area.id);
  }
  for (const question of template.questions) {
    for (const field of questionFields) assert.ok(text(question[field]),question.id+' — brak '+field);
    assert.ok(question.id.startsWith(template.id+'-'), 'Niepoprawny identyfikator '+question.id);
    assert.ok(areas.has(question.area),'Brak obszaru dla '+question.id);
    assert.ok(allowedRisk.includes(question.risk),'Nieznana waga '+question.id);
    assert.equal(question.permission,'read','Pytanie wykracza poza odczyt '+question.id);
    assert.match(question.reference,/^(?:Do weryfikacji|Obszar CIS Controls — [^0-9]+)$/,'Niedozwolone odniesienie '+question.id);
    allQuestions.push(question.id);
  }
}
unique(allQuestions,'Wszystkie pytania');
assert.equal(advanced.length,5);
assert.equal(upcoming.length,3);
unique([...advanced,...upcoming].map(card=>card.id),'Karty zaawansowane');
const app = read('assets/app-v2.js');
for (const card of advanced) {
  assert.ok([3,4].includes(card.level)&&text(card.prerequisites));
  assert.ok(app.includes("{id:'"+card.preset+"',name:"),'Brak profilu dla '+card.id);
}
assert.ok(upcoming.every(card=>!card.preset && !card.questions && text(card.description) && [3,4].includes(card.level)));

const starter = templates.find(item=>item.level===1);
const materialIds = demo.materials.map(([id])=>id);
unique(materialIds,'Materiały fikcyjne');
unique(demo.answers.map(item=>item.id),'Klucz odpowiedzi');
assert.equal(demo.answers.length,starter.questions.length);
for (const item of demo.answers) {
  assert.ok(starter.questions.some(question=>question.id===item.id),'Klucz wskazuje brak pytania '+item.id);
  assert.ok(materialIds.includes(item.evidence),'Klucz wskazuje brak materiału '+item.id);
  assert.ok(Object.hasOwn(results,item.status),'Niepoprawna ocena w kluczu '+item.id);
}

const html = read('index.html');
assert.ok(html.includes("connect-src 'none'"));
const includes = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]);
for (const file of includes) assert.ok(file.startsWith('assets/')&&fs.existsSync(path.join(root,file)),'Brak lokalnego skryptu '+file);
for (const name of ['project-data','templates-data','demo-data','learning-ui','followup-ui']) {
  assert.ok(includes.indexOf('assets/'+name+'.js')>=0&&includes.indexOf('assets/'+name+'.js')<includes.indexOf('assets/app-v2.js'),
    'Niewłaściwa kolejność załadowania '+name);
}
console.log('OK: '+templates.length+' szablonów, '+allQuestions.length+' pytań do odczytu, '+demo.answers.length+' odpowiedzi ćwiczenia.');
