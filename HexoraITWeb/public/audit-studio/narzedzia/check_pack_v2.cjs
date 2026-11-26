/**
 * CyberAudit Studio 2.0 - kontrola spójności dostarczonych danych i plików.
 * Uruchamiaj z katalogu projektu albo wprost: node narzedzia/check_pack_v2.cjs
 * Nie wymaga npm ani połączenia z Internetem.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{}};
vm.createContext(context);
const problems=[];
function assert(ok,what){if(!ok)problems.push(what);}
for(const file of ['audit-data.js','playbook-data.js','requirements-data.js']){
  const full=path.join(root,'assets',file);
  assert(fs.existsSync(full),`Brak ${full}`);
  if(fs.existsSync(full))vm.runInContext(fs.readFileSync(full,'utf8'),context,{filename:file});
}
const A=context.window.AUDIT_DATA||{stages:[],sources:[]};
const G=context.window.AUDIT_GUIDE||{steps:{},topics:{}};
const R=context.window.AUDIT_REQUIREMENTS||[];
const tasks=A.stages.flatMap(s=>s.tasks);
const taskIds=new Set(tasks.map(t=>t.id));
const sourceIds=new Set(A.sources.map(s=>s.id));
assert(tasks.length===93,`Oczekiwano 93 zadań, jest ${tasks.length}`);
assert(R.length===68,`Oczekiwano 68 kryteriów, jest ${R.length}`);
assert(taskIds.size===tasks.length,'Powtarzające się ID zadań');
assert(new Set(R.map(r=>r.id)).size===R.length,'Powtarzające się ID wymagań');
for(const t of tasks){
 const steps=G.steps[t.id];assert(steps?.length===3,`Brakuje trzech kroków w ${t.id}`);
 assert(t.name && t.action && t.evidence,`Niekompletna karta ${t.id}`);
 for(const id of (t.refs||'').split(';').filter(Boolean))assert(sourceIds.has(id),`Brak źródła ${id} w zadaniu ${t.id}`);
}
for(const [id,steps] of Object.entries(G.steps))assert(taskIds.has(id),`Kroki wskazują nieistniejące zadanie ${id}`);
for(const [topic,ids] of Object.entries(G.topics||{}))for(const id of ids)assert(taskIds.has(id),`Topic ${topic} wskazuje brak ${id}`);
for(const r of R){assert(r.frame && r.title && r.reference && r.question,`Kryterium ${r.id} niekompletne`);for(const id of r.tasks||[])assert(taskIds.has(id),`Kryterium ${r.id} wskazuje nieistniejące zadanie ${id}`);}
for(const s of A.sources)assert(/^https:\/\//.test(s.url),`Niepoprawny URL źródła ${s.id}`);
for(const file of ['index.html','assets/style.css','assets/app-v2.js','README.md',
  'formularze_pdf/01_mandat_i_roe.pdf','formularze_pdf/07_raport_koncowy.pdf',
  'przyklady_v2/raport_przykladowy_demo.pdf'])assert(fs.existsSync(path.join(root,file)),`Nie odnaleziono ${file}`);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const filename of ['audit-data.js','playbook-data.js','requirements-data.js','app-v2.js'])assert(html.includes(`assets/${filename}`),`index.html nie dołącza ${filename}`);
for(const filename of ['01_mandat_i_roe','02_kontekst_i_zakres','03_inwentarz_sieci','04_rejestr_dowodow','05_rejestr_ryzyka','06_raport_wstepny','07_raport_koncowy','08_plan_capa','09_karta_incydentu','10_zamkniecie_i_retest']){
 for(const [folder,ext] of [['formularze_pdf','pdf'],['szablony_edytowalne','md']])assert(fs.existsSync(path.join(root,folder,filename+'.'+ext)),`Nie odnaleziono ${filename}.${ext}`);
}
console.log(`Zadania: ${tasks.length} | Podpunkty: ${Object.values(G.steps).reduce((n,a)=>n+a.length,0)} | Kryteria: ${R.length} | Źródła: ${A.sources.length}`);
if(problems.length){console.error('NIEZGODNOŚCI:');for(const p of problems)console.error('- '+p);process.exitCode=1;}
else console.log('OK: mapa powiązań, ID, pliki i podstawowa kompletność danych.');
