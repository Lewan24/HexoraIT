/**
 * CyberAudit Studio 2.0 - praca w trybie offline, bez zewnętrznych bibliotek.
 * Dane kontrolne: audit-data.js, playbook-data.js, requirements-data.js.
 * Tu znajdują się: konfigurator -> wybór planu -> zadania -> wymagania ->
 * dowody -> ustalenia -> raport HTML/PDF za pomocą natywnego okna drukowania.
 * Dane zapisywane są w localStorage w postaci jawnej. Nie umieszczaj sekretów.
 */
(() => {
  'use strict';
  const APP_VERSION='2.2';
  const A=window.AUDIT_DATA, G=window.AUDIT_GUIDE, R=window.AUDIT_REQUIREMENTS;
  const ALL=A.stages.flatMap(s=>s.tasks.map(t=>({...t,stage:s.id,stageTitle:s.title,phase:s.mode})));
  const TASK_BY_ID=Object.assign(Object.create(null),Object.fromEntries(ALL.map(t=>[t.id,t])));
  const SOURCE_BY_ID=Object.fromEntries(A.sources.map(s=>[s.id,s]));
  const scope=new URLSearchParams(location.search);
  const workspace=scope.get('workspace'),account=scope.get('account');
  const isScopeId=value=>/^[a-z0-9-]{1,80}$/i.test(value||'');
  const embeddedScope=isScopeId(workspace)&&isScopeId(account);
  const scopeSuffix=embeddedScope?`:${account}:${workspace}`:'';
  const LEGACY_KEY='cyberaudit-studio-v2'+scopeSuffix;
  const KEY='cyberaudit-studio-v3'+scopeSuffix;
  const LAST_COPY_KEY=KEY+'-last-backup';
  const STORAGE_ESTIMATE=5*1024*1024;
  const {normalizeProject,dateOnly,risk,learningProgram,
    newProject,migrateProject,normalizeV3,normalizeWorkspace,latestClosingDecision,questionSource,evidenceReferences,results}=window.AUDIT_PROJECT_DATA;
  const {createAuditFollowupUI,decisionLabel,labels:findingLabels}=window.AUDIT_FOLLOWUP;
  const {templates}=window.AUDIT_TEMPLATES;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const h=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
  const v=(id)=>document.getElementById(id);
  const dateNow=()=>new Date().toLocaleDateString('sv-SE');
  const makeId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');
  const LABEL={new:'Nie rozpoczęto',progress:'W trakcie',waiting:'Brak dowodów / blokada',done:'Wykonane',na:'Poza zakresem / N/D',unassessed:'Nie oceniono',conform:'Zgodne w próbie',partial:'Częściowo zgodne',nonconform:'Niezgodne',unknown:'Brak wystarczających dowodów',notapp:'Nie dotyczy',open:'Otwarte',doing:'W realizacji',retest:'Do ponownego sprawdzenia',closed:'Zamknięte po ponownym sprawdzeniu',accepted:'Ryzyko zaakceptowane'};
  const FRAMEWORKS=[
    {id:'KSC',name:'KSC / NIS2',subtitle:'Polska: ustawa o KSC + art. 20/21/23 NIS2',kind:'prawo'},
    {id:'ISO',name:'ISO/IEC 27001:2022',subtitle:'Indeks wymagań SZBI, SoA i audytu',kind:'norma'},
    {id:'NIST',name:'NIST CSF 2.0',subtitle:'Govern, Identify, Protect, Detect, Respond, Recover',kind:'metodyka'},
    {id:'CIS',name:'CIS Controls v8.1',subtitle:'18 rodzin kontroli; safeguards dobierz osobno',kind:'metodyka'},
    {id:'GDPR',name:'RODO (art. 32-35)',subtitle:'Bezpieczeństwo danych i incydenty',kind:'prawo'},
    {id:'DORA',name:'DORA',subtitle:'Sektor finansowy, gdy ma zastosowanie',kind:'prawo'},
    {id:'EU2690',name:'Rozp. UE 2024/2690',subtitle:'Wybrane usługi cyfrowe i zaufania',kind:'prawo'},
    {id:'CRA',name:'CRA',subtitle:'Produkty z elementami cyfrowymi, terminy etapowe',kind:'prawo'},
    {id:'OWASP',name:'OWASP ASVS / WSTG',subtitle:'Aplikacje internetowe i API',kind:'metodyka'}
  ];
  const DEPTH={quick:'Szybki przegląd',standard:'Standardowy',deep:'Pogłębiony'};
  const SIZE={small:'Mała',medium:'Średnia',large:'Duża'};
  const TOPICS=[
    {id:'governance',name:'Zarządzanie i SZBI',glyph:'♙'},
    {id:'assets',name:'Inwentarz i architektura',glyph:'▦'},
    {id:'network',name:'Sieci, firewall, Wi-Fi',glyph:'◎'},
    {id:'identity',name:'Konta, MFA, IAM',glyph:'⚿'},
    {id:'systems',name:'Serwery, VM, endpointy',glyph:'▣'},
    {id:'continuity',name:'Incydenty, monitorowanie i kopie zapasowe',glyph:'↺'},
    {id:'suppliers',name:'Dostawcy ICT',glyph:'⇄'},
    {id:'data',name:'Dane i prywatność',glyph:'◈'},
    {id:'apps',name:'Aplikacje i API',glyph:'〈〉'},
    {id:'cloud',name:'Chmura i SaaS',glyph:'☁'},
    {id:'ot',name:'OT / ICS',glyph:'⚙'}
  ];
  const DOCS=[
    ['01_mandat_i_roe','Mandat i Rules of Engagement','Upoważnienie, ograniczenia testów, kontakty awaryjne'],
    ['02_kontekst_i_zakres','Kontekst i zakres','Cel, jednostki, wyłączenia, wymagania'],
    ['03_inwentarz_sieci','Inwentarz sieci i sprzętu','Spis urządzeń, sieci, oprogramowania i właścicieli'],
    ['04_rejestr_dowodow','Rejestr dowodów','Pochodzenie materiału, ID, weryfikacja'],
    ['05_rejestr_ryzyka','Rejestr ryzyk','Prawdopodobieństwo, wpływ, właściciel i decyzja'],
    ['06_raport_wstepny','Raport rozpoznania','Wyniki etapu wstępnego i szybkie usprawnienia'],
    ['07_raport_koncowy','Raport końcowy','Podsumowanie, niezgodności i rekomendacje'],
    ['08_plan_capa','Plan działań naprawczych','Działania, terminy, dowody zamknięcia'],
    ['09_karta_incydentu','Karta incydentu','Oś czasu, klasyfikacja, zgłoszenia'],
    ['10_zamkniecie_i_retest','Zamknięcie i ponowne sprawdzenie','Weryfikacja wdrożenia i akceptacje']
  ];
  // Do ponownego sprawdzenia zachowujemy krótki kręgosłup dokumentacyjny, nie 21 kontroli pełnego audytu.
  const RETEST_BASE=['P01','P02','P03','P04','P06','P07','F61','F62','F63','F64','F65','F66','F68'];
  const PRESETS=[
    {id:'nis2',name:'Gotowość KSC / NIS2',desc:'Wybrane obowiązki, dowody i luki po ostatnim audycie.',type:'compliance',depth:'standard',standards:['KSC'],topics:TOPICS.map(x=>x.id),tech:{cloud:false,apps:false,ot:false}},
    {id:'discovery',name:'Pierwszy audyt sieci',desc:'Rozpoznanie środowiska, zasoby i podstawowe ryzyka.',type:'discovery',depth:'standard',standards:['CIS','NIST'],topics:TOPICS.map(x=>x.id),tech:{cloud:false,apps:false,ot:false}},
    {id:'retest',name:'Sprawdzenie po zmianach',desc:'Weryfikacja wyłącznie poprawianych obszarów i ustaleń.',type:'retest',depth:'standard',standards:['KSC'],topics:TOPICS.map(x=>x.id),tech:{cloud:false,apps:false,ot:false}},
    {id:'iso',name:'Przegląd ISO 27001',desc:'SZBI, SoA i dobór testów, z licencjonowaną normą.',type:'compliance',depth:'deep',standards:['ISO'],topics:TOPICS.map(x=>x.id),tech:{cloud:false,apps:false,ot:false}},
    {id:'technical',name:'Audyt techniczny',desc:'Dostęp, infrastruktura, logi, kopie i konfiguracja.',type:'technical',depth:'deep',standards:['CIS','NIST'],topics:['assets','network','identity','systems','continuity','apps','cloud'],tech:{cloud:false,apps:false,ot:false}},
    {id:'full',name:'Pełny program audytu',desc:'Przegląd przekrojowy i wybór właściwych dla organizacji technologii.',type:'integrated',depth:'deep',standards:[],topics:TOPICS.map(x=>x.id),tech:{cloud:false,apps:false,ot:false}},
    {id:'custom',name:'Audyt własny',desc:'Zbuduj plan od zera i dostosuj szczegóły.',type:'integrated',depth:'standard',standards:[],topics:TOPICS.map(x=>x.id),tech:{cloud:false,apps:false,ot:false}}
  ];
  const initial=()=>({
    schema:2,
    config:{preset:'nis2',name:'',org:'',lead:'',sponsor:'',type:'compliance',depth:'standard',size:'medium',standards:['KSC'],topics:TOPICS.map(x=>x.id),tech:{cloud:false,apps:false,ot:false},legal:'unknown',legalEvidence:'',scope:'',exclusions:'',period:'',previous:'',targets:'',manual:{},criterionManual:{}},
    tasks:{}, requirements:{}, evidence:[], findings:[],
    report:{classification:'Poufne - do uzgodnienia',method:'Wywiady, przegląd dokumentów, kontrola konfiguracji tylko do odczytu, próbkowanie oparte na ryzyku. Testy aktywne wyłącznie po zatwierdzeniu RoE.',summary:'',limits:'',conclusion:'none',approved:'',appendix:true},updated:null,changesSinceExport:0
  });
  const emptyWorkspace=()=>({schema:3,revision:0,activeId:null,projects:[]});
  let workspaceState=emptyWorkspace(),state=newProject(initial(),makeId());
  let savedSnapshot=null,contentSnapshot='',recovery=null,replacement=null;
  let storageAvailable=true,saveTimer,dirty=false,transitioning=false;
  let projectFormPreset=null,projectFormTemplate=null,projectFormMode='learning',editingProjectId=null;
  let lastSaved='Projekt nie był jeszcze zapisywany.';
  let availableCopy=null;
  const taskIds=new Set(ALL.map(task=>task.id));
  const requirementIds=new Set(R.map(requirement=>requirement.id));
  const openTasks=new Set();
  const reportFields={'rp-class':'classification','rp-method':'method','rp-summary':'summary','rp-limits':'limits','rp-conclusion':'conclusion','rp-approved':'approved','rp-appendix':'appendix'};
  const blankTask=()=>({status:'new',assessment:'unassessed',checks:[false,false,false],evidence:'',owner:'',sample:'',notes:'',reason:'',verified:false});
  const taskState=id=>state.tasks[id]||blankTask();
  const reqState=id=>state.requirements[id]||{status:'unassessed',evidence:'',notes:'',applicability:'pending'};
  const normalize=project=>normalizeProject(project,initial,taskIds,requirementIds,blankTask);
  const projectContent=({updated,changesSinceExport,...content})=>JSON.stringify(content);
  const learningUI=window.createAuditLearningUI({h,getState:()=>state,hasProject,save,go,
    chooseTemplate:chooseLearningTemplate,chooseProfile,nextEvidenceId,nextFindingId,
    refreshRecords:()=>{renderEvidence();renderFindings();renderDashboard();renderReport();}});
  const renderLearner=learningUI.render;
  const setupLearningEvents=learningUI.bind;
  const followup=createAuditFollowupUI({h,getState:()=>state,save,dateNow,openQuestion,showFinding,
    refresh:()=>{renderFindings();renderDashboard();renderReport();}});

  function openQuestion(key,id){
    if(!Object.hasOwn(state.learning.programs,key)||!state.learning.programs[key].template.questions.some(item=>item.id===id))return;
    state.mode='learning';
    state.learning.selected=key;
    save();
    applyMode();
    go('audit/'+key+'/'+id);
  }

  function showFinding(id){
    const index=state.findings.findIndex(item=>item.id===id);
    if(index<0)return;
    const field=v('finding-'+index+'-observation');
    field?.focus({preventScroll:true});
    field?.scrollIntoView({block:'center'});
  }

  function resetContentSnapshot(){
    contentSnapshot=projectContent(state);
    dirty=false;
  }

  function activate(){
    state=workspaceState.projects.find(project=>project.id===workspaceState.activeId)??newProject(initial(),makeId());
    resetContentSnapshot();
    v('evidence-return').hidden=true;
  }

  function archiveRecovery(raw,key){
    const prefix=key+'-corrupt-';
    recovery={raw,archived:false,offered:false};
    try{
      let archived=false;
      for(let index=0;index<localStorage.length&&!archived;index++){
        const item=localStorage.key(index);
        archived=Boolean(item?.startsWith(prefix)&&localStorage.getItem(item)===raw);
      }
      if(!archived)localStorage.setItem(prefix+new Date().toISOString(),raw);
      recovery.archived=true;
    }catch{ /* Oryginał pozostaje pod dotychczasowym kluczem. */ }
    lastSaved='Zapis wstrzymany do decyzji o odzyskaniu danych.';
  }

  async function load(){
    let legacy=null;
    try{
      savedSnapshot=localStorage.getItem(KEY);
      availableCopy=localStorage.getItem(LAST_COPY_KEY)??localStorage.getItem(LEGACY_KEY+'-last-backup');
      if(savedSnapshot===null)legacy=localStorage.getItem(LEGACY_KEY);
    }catch{
      storageAvailable=false;
      lastSaved='Pamięć przeglądarki jest niedostępna. Pobierz kopię JSON, aby zachować pracę.';
    }
    if(savedSnapshot!==null){
      try{
        workspaceState=normalizeWorkspace(JSON.parse(savedSnapshot),normalize);
        lastSaved=workspaceState.projects.length?'Wczytano projekty z przeglądarki.':'Lista projektów jest pusta.';
      }
      catch{archiveRecovery(savedSnapshot,KEY);}
    }else if(legacy!==null){
      let project;
      try{project=migrateProject(JSON.parse(legacy),normalize,makeId());}
      catch{archiveRecovery(legacy,LEGACY_KEY);}
      if(project){
        recovery={raw:legacy,archived:true,offered:false,migration:project};
        if(await retryMigration())lastSaved='Przeniesiono dotychczasowy projekt. Oryginał zachowano.';
      }
    }
    activate();
  }

  async function retryMigration(){
    const pending=recovery;
    if(!await commitWorkspace(current=>({...current,activeId:pending.migration.id,projects:[pending.migration]}),
      { legacy:pending.raw }))return false;
    recovery=null;
    return true;
  }

  function updateStorageDisplay(){
    const name=hasProject()?(state.config.name.trim()||'Projekt bez nazwy'):'Wybierz projekt';
    const project=v('active-project');
    project.textContent=name;
    project.title=name;
    const status=v('save-indicator');
    if(status.textContent!==lastSaved)status.textContent=lastSaved;
    const count=state.changesSinceExport;
    v('changes-since-export').textContent='Zmiany od ostatniej kopii JSON: '+count;
    v('backup-reminder').hidden=count<10 || !hasProject();
    v('changes-since-export').hidden=!hasProject();
    v('top-export').disabled=!hasProject();
    v('top-pdf').disabled=!hasProject();
    v('project-mode').value=state.mode;
    v('demo-badge').hidden=!state.demo;
    v('last-copy-download').hidden=availableCopy===null;
    const meter=v('storage-meter'),label=v('storage-usage');
    try{
      let bytes=0;
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(key!==null)bytes+=2*(key.length+(localStorage.getItem(key)?.length||0));
      }
      const percent=Math.round(100*bytes/STORAGE_ESTIMATE);
      meter.value=Math.min(bytes,STORAGE_ESTIMATE);
      meter.hidden=false;
      label.textContent='Pamięć przeglądarki: około '+percent+'% z 5 MiB';
      v('storage-warning').hidden=percent<80;
    }catch{
      meter.hidden=true;
      label.textContent='Brak szacunku zajętości pamięci przeglądarki.';
      v('storage-warning').hidden=true;
    }
    v('recovery-panel').hidden=!recovery;
    if(recovery){
      v('resume-save').textContent=recovery.migration?'Ponów przenoszenie':'Utwórz pustą listę projektów';
      v('recovery-download').textContent=recovery.migration?'Pobierz oryginalny zapis':'Pobierz uszkodzony zapis';
      v('recovery-message').textContent=recovery.migration
        ?'Przenoszenie projektu czeka na zapis. Oryginał jest bezpieczny. '+lastSaved
        :recovery.archived
        ?'Nie można otworzyć zapisu projektu. Oryginalne dane zachowano w pamięci przeglądarki. Pobierz je albo świadomie wznów zapis.'
        :'Nie można otworzyć zapisu ani utworzyć dodatkowej kopii w przeglądarce. Oryginalny zapis nadal istnieje. Pobierz go przed wznowieniem zapisu.';
      v('resume-save').disabled=!recovery.archived&&!recovery.offered;
    }
  }

  function hasProject(){return workspaceState.activeId!==null;}

  async function commitWorkspace(change,{legacy}={}){
    const commit=()=>{
      try{
        if(storageAvailable&&(localStorage.getItem(KEY)!==savedSnapshot ||
            (legacy!==undefined && localStorage.getItem(LEGACY_KEY)!==legacy))){
          lastSaved='Zapis zmienił się w innej karcie. Pobierz kopię JSON i odśwież stronę.';
          return false;
        }
        const next=change(workspaceState);
        next.revision=workspaceState.revision+1;
        if(storageAvailable){
          const snapshot=JSON.stringify(next);
          localStorage.setItem(KEY,snapshot);
          if(legacy!==undefined&&localStorage.getItem(KEY)!==snapshot){
            lastSaved='Przeniesiony zapis zmienił się w innej karcie. Odśwież stronę.';
            return false;
          }
          savedSnapshot=snapshot;
        }
        workspaceState=next;
        dirty=false;
        lastSaved=storageAvailable?'Zapisano w przeglądarce.':'Projekt jest tylko w tej karcie. Pobierz kopię JSON.';
        return true;
      }catch{
        lastSaved='Nie udało się zapisać. Sprawdź miejsce w pamięci i pobierz kopię JSON.';
        return false;
      }
    };
    if(storageAvailable&&navigator.locks?.request){
      try{return await navigator.locks.request(KEY,commit);}
      catch{ /* Wersja z pliku może nie udostępniać blokad. */ }
    }
    return commit();
  }

  async function flushChanges(){
    clearTimeout(saveTimer);
    if(!dirty || recovery || transitioning)return;
    await commitWorkspace(current=>({...current}));
    updateStorageDisplay();
  }

  function save(){
    if(!hasProject())return;
    const content=projectContent(state);
    if(content!==contentSnapshot){
      contentSnapshot=content;
      state.changesSinceExport=Math.min(Number.MAX_SAFE_INTEGER,state.changesSinceExport+1);
      state.updated=new Date().toISOString();
      dirty=true;
      lastSaved='Zmiany oczekują na zapis.';
      clearTimeout(saveTimer);
      if(!recovery)saveTimer=setTimeout(flushChanges,220);
    }
    updateStorageDisplay();
  }

  async function transition(change,screen){
    if(transitioning)return false;
    if(recovery){
      v('recovery-panel').scrollIntoView({block:'nearest'});
      v('recovery-download').focus();
      return false;
    }
    transitioning=true;
    clearTimeout(saveTimer);
    try{
      if(!await commitWorkspace(change)){
        updateStorageDisplay();
        return false;
      }
      activate();
      openTasks.clear();
      v('show-all-tasks').checked=state.config.preset==='full';
      v('task-search').value='';
      v('task-filter').value='all';
      v('req-search').value='';
      v('req-filter').value='all';
      v('show-all-criteria').checked=false;
      v('evidence-form').reset();
      v('finding-form').reset();
      if(v('answer-key'))v('answer-key').hidden=true;
      renderAll();
      updateStorageDisplay();
      if(screen)go(screen);
      return true;
    }finally{transitioning=false;}
  }

  function go(screen){
    if(location.hash==='#'+screen)route(true);
    else location.hash='#'+screen;
  }

  function addProject(project,screen){
    return transition(current=>({...current,activeId:project.id,projects:[...current.projects,project]}),screen);
  }

  function saveLastCopy(project){
    availableCopy=projectJson(project);
    try{localStorage.setItem(LAST_COPY_KEY,availableCopy);return true;}
    catch{return false;}
  }

  function applyMode(){
    const auditor=state.mode==='auditor';
    $$('[data-auditor]').forEach(el=>{el.hidden=!auditor;});
    $$('[data-learner]').forEach(el=>{el.hidden=auditor;});
    v('project-mode').value=state.mode;
  }

  function renderWorkspace(){
    v('project-list').innerHTML=workspaceState.projects.length?workspaceState.projects.map(project=>{
      const active=project.id===workspaceState.activeId;
      const name=project.config.name||'Projekt bez nazwy';
      const modified=project.updated?new Date(project.updated).toLocaleString('pl-PL'):'brak';
      return `<li class="panel project-card">
        <div><h2>${h(name)}</h2><p>${h(project.config.org||'Firma niepodana')} · ${h(project.auditDate||'Brak daty audytu')}${project.demo?' · Ćwiczenie':''}${active?' · Aktywny':''}</p>
        <small>Ostatnia zmiana: ${h(modified)}</small></div>
        <div class="button-row">
          <button type="button" class="btn btn-accent btn-sm" data-project-action="open" data-project-id="${h(project.id)}">Otwórz</button>
          <button type="button" class="btn btn-light btn-sm" data-project-action="copy" data-project-id="${h(project.id)}">Skopiuj</button>
          <button type="button" class="btn btn-light btn-sm" data-project-action="export" data-project-id="${h(project.id)}">Eksportuj JSON</button>
          <button type="button" class="btn btn-outline-danger btn-sm" data-project-action="delete" data-project-id="${h(project.id)}">Usuń</button>
        </div></li>`;
    }).join(''):'<li class="empty-state">Brak zapisanych projektów. Utwórz nowy albo wczytaj kopię JSON.</li>';
    v('delete-demo').hidden=!workspaceState.projects.some(project=>project.demo);
  }

  function configurePreset(project,id){
    const preset=PRESETS.find(item=>item.id===id);
    if(!preset)return;
    project.config={...project.config,preset:preset.id,type:preset.type,depth:preset.depth,standards:[...preset.standards],
      topics:[...preset.topics],tech:{...preset.tech},manual:{},criterionManual:{},targets:''};
  }

  function startProject({preset=null,template=null,edit=false}={}){
    editingProjectId=edit&&hasProject()?state.id:null;
    projectFormPreset=preset;
    projectFormTemplate=template;
    projectFormMode=preset?'auditor':template?'learning':state.mode;
    const form=v('project-form');
    form.reset();
    if(editingProjectId){
      for(const key of ['name','org','lead','scope'])form.elements[key].value=state.config[key];
      form.elements.auditDate.value=state.auditDate||dateNow();
    }else form.elements.auditDate.value=dateNow();
    v('project-dialog-heading').textContent=editingProjectId?'Edytuj dane projektu':'Nowy projekt';
    v('project-form-message').textContent='';
    v('project-dialog').showModal();
  }

  function selectProgram(project,template){
    const key=template.id+'-'+template.version;
    if(!Object.hasOwn(project.learning.programs,key))project.learning.programs[key]=learningProgram(template);
    project.learning.selected=key;
  }

  function chooseLearningTemplate(template){
    if(!hasProject()){startProject({template});return;}
    selectProgram(state,template);
    save();
    renderLearner();
    go('audit');
  }

  function chooseProfile(id){
    if(!hasProject()){startProject({preset:id});return;}
    if((Object.keys(state.config.manual).length||Object.keys(state.config.criterionManual).length)&&
       !confirm('Nowy profil zastąpi ręczne zmiany zakresu zadań i wymagań. Zastosować profil?'))return;
    applyPreset(id);
    if(id==='full'){
      v('show-all-tasks').checked=true;
      renderPlan();
    }
    go('setup');
  }

  function convertImport(source){
    if([2,'2'].includes(source?.schema))return migrateProject(source,normalize,makeId());
    return {...normalizeV3(source,normalize),id:makeId()};
  }

  function importCorrections(raw,normalized){
    if(raw===null || typeof raw!=='object')return raw===normalized?0:1;
    if(normalized===null || typeof normalized!=='object')return 1;
    return Object.keys(raw).reduce((count,key)=>count+importCorrections(raw[key],normalized[key]),0);
  }

  function displayReplacement(details,title,message,label){
    replacement=details;
    v('replace-heading').textContent=title;
    v('replace-message').textContent=message;
    v('replace-download').hidden=!details.copy;
    v('replace-confirm').textContent=label;
    v('replace-confirm').disabled=details.requiresDownload===true;
    v('replace-dialog').showModal();
  }

  function deleteProject(project){
    const stored=saveLastCopy(project);
    displayReplacement({ deleteId:project.id,copy:availableCopy,requiresDownload:!stored },
      'Usunąć projekt „'+(project.config.name||'Projekt bez nazwy')+'”?',stored
        ?'Zapisano ostatnią kopię. Przed usunięciem możesz również pobrać ją na dysk.'
        :'Pobierz kopię na dysk przed usunięciem. Przeglądarka nie zapisała kopii.', 'Usuń projekt');
    updateStorageDisplay();
  }

  async function openDemo(){
    const existing=state.demo?state:workspaceState.projects.find(project=>project.demo);
    if(existing){
      await transition(current=>({...current,activeId:existing.id}),'audit');
      return;
    }
    const project=newProject(initial(),makeId());
    project.auditDate=dateNow();
    project.demo=true;
    Object.assign(project.config,{name:'Ćwiczenie — pierwszy audyt',org:'Firma Demo Sp. z o.o.',
      lead:'Osoba ucząca się',scope:'Przegląd materiałów dydaktycznych o kontach, urządzeniach, danych i organizacji pracy.',
      standards:[],preset:'custom',type:'integrated'});
    selectProgram(project,templates[0]);
    project.updated=new Date().toISOString();
    await addProject(project,'audit');
  }

  function setupWorkspaceEvents(){
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-new]'))startProject();
    });
    v('project-mode').addEventListener('change',event=>{
      state.mode=event.target.value==='auditor'?'auditor':'learning';
      save();
      applyMode();
      renderReport();
      route(true);
    });
    v('edit-project').addEventListener('click',()=>startProject({edit:true}));
    v('project-cancel').addEventListener('click',()=>v('project-dialog').close());
    v('project-form').addEventListener('submit',async event=>{
      event.preventDefault();
      const form=event.currentTarget;
      const data=new FormData(form);
      const values=Object.fromEntries(['name','org','lead','scope'].map(key=>[key,String(data.get(key)??'').trim()]));
      const auditDate=dateOnly(data.get('auditDate'));
      if(!auditDate||Object.values(values).some(value=>!value)){
        v('project-form-message').textContent='Uzupełnij nazwę, firmę, audytora, zakres i datę.';
        return;
      }
      if(editingProjectId){
        const id=editingProjectId;
        const committed=await transition(current=>({...current,projects:current.projects.map(project=>project.id===id
          ?{...project,config:{...project.config,...values},auditDate,updated:new Date().toISOString(),
            changesSinceExport:Math.min(Number.MAX_SAFE_INTEGER,project.changesSinceExport+1)}:project)}),'audit/zgoda');
        if(committed){v('project-dialog').close();v('learning-consent').focus();}
        else v('project-form-message').textContent=lastSaved;
        return;
      }
      const project=newProject(initial(),makeId(),projectFormMode);
      project.auditDate=auditDate;
      project.updated=new Date().toISOString();
      Object.assign(project.config,values);
      if(project.mode==='auditor')configurePreset(project,projectFormPreset??'custom');
      else{
        Object.assign(project.config,{standards:[],preset:'custom',type:'integrated'});
        selectProgram(project,projectFormTemplate??templates[0]);
      }
      const screen=project.mode==='auditor'?'setup':projectFormTemplate?'audit':'home';
      if(await addProject(project,screen)){
        if(projectFormPreset==='full'){v('show-all-tasks').checked=true;renderPlan();}
        v('project-dialog').close();
        $('#view-'+screen+' h1')?.focus();
      }else v('project-form-message').textContent=lastSaved;
    });

    v('project-list').addEventListener('click',async event=>{
      const button=event.target.closest('[data-project-action]');
      if(!button)return;
      const project=workspaceState.projects.find(item=>item.id===button.dataset.projectId);
      if(!project)return;
      const action=button.dataset.projectAction;
      if(action==='delete'){deleteProject(project);return;}
      if(action==='export'){
        if(project.id===state.id)exportJson();
        else download(filenameBase(project)+'-'+dateNow()+'.json',projectJson(project),'application/json;charset=utf-8');
        return;
      }
      if(action==='copy'){
        const copy=structuredClone(project);
        copy.id=makeId();
        copy.config.name=(copy.config.name||'Projekt')+' — kopia';
        copy.updated=new Date().toISOString();
        if(await addProject(copy,'home'))return;
      }else if(await transition(current=>({...current,activeId:project.id}),'home'))return;
      v('project-message').textContent=lastSaved;
    });
    v('open-demo').addEventListener('click',()=>void openDemo());
    v('delete-demo').addEventListener('click',()=>{
      const project=state.demo?state:workspaceState.projects.find(item=>item.demo);
      if(project)deleteProject(project);
    });

    v('last-copy-download').addEventListener('click',()=>{
      if(availableCopy!==null)download('ostatnia-kopia-audytu.json',availableCopy,'application/json;charset=utf-8');
    });
    v('recovery-download').addEventListener('click',()=>{
      if(!recovery)return;
      download(recovery.migration?'oryginalny-projekt-2.json':'uszkodzony-zapis-audytu.txt',recovery.raw);
      recovery.offered=true;
      updateStorageDisplay();
    });
    v('resume-save').addEventListener('click',async()=>{
      if(!recovery||(!recovery.archived&&!recovery.offered)||transitioning)return;
      transitioning=true;
      try{
        if(recovery.migration)await retryMigration();
        else if(confirm('Rozpocząć z pustą listą? Kopia odzyskiwania pozostanie dostępna po pobraniu lub w pamięci.')){
          if(await commitWorkspace(()=>emptyWorkspace()))recovery=null;
        }
        if(!recovery){activate();renderAll();go('projects');}
        updateStorageDisplay();
      }finally{transitioning=false;}
    });
    v('replace-download').addEventListener('click',()=>{
      if(!replacement?.copy)return;
      download('ostatnia-kopia-audytu.json',replacement.copy,'application/json;charset=utf-8');
      v('replace-confirm').disabled=false;
    });
    v('replace-cancel').addEventListener('click',()=>v('replace-dialog').close());
    v('replace-dialog').addEventListener('close',()=>{replacement=null;});
    v('replace-confirm').addEventListener('click',async()=>{
      if(!replacement || transitioning)return;
      const details=replacement;
      const done=details.next ? await addProject(details.next,'home') : await transition(current=>{
        const projects=current.projects.filter(project=>project.id!==details.deleteId);
        return {...current,projects,activeId:current.activeId===details.deleteId?(projects[0]?.id??null):current.activeId};
      },'projects');
      if(done)v('replace-dialog').close();
      else v('replace-message').textContent=lastSaved;
    });
    v('import-file').addEventListener('change',async event=>{
      const file=event.target.files[0];
      event.target.value='';
      if(!file)return;
      if(file.size>8_000_000){v('project-message').textContent='Plik przekracza 8 MB.';return;}
      try{
        const source=JSON.parse(await file.text());
        const next=convertImport(source);
        const metadata=new Set(['schema','id','exported','projectName','appVersion']);
        const corrections=Object.keys(source).filter(key=>!metadata.has(key))
          .reduce((count,key)=>count+importCorrections(source[key],next[key]),0);
        next.changesSinceExport=0;
        const notice=corrections?' Podczas walidacji zmieniono lub pominięto wartości pól: '+corrections+'. Zatrzymaj oryginalny plik do porównania.':'';
        displayReplacement({next},'Wczytać „'+(next.config.name||'Projekt bez nazwy')+'”?',
          'Plik zostanie dodany jako osobny projekt.'+notice,'Wczytaj projekt');
      }catch(ex){v('project-message').textContent='Nie udało się wczytać projektu. '+ex.message;}
    });
  }

  function itemTopics(id){return TOPICS.filter(x=>(G.topics[x.id]||[]).includes(id)).map(x=>x.id);}
  function hasRelevantTech(t){if(t.applicability==='cloud'&&!state.config.tech.cloud)return false;if(t.applicability==='apps'&&!state.config.tech.apps)return false;if(t.applicability==='ot'&&!state.config.tech.ot)return false;return true;}
  function selectedByType(t){const c=state.config;
    if(c.type==='discovery')return t.phase==='pre';
    if(c.type==='integrated')return true;
    if(c.type==='compliance')return t.phase==='full'||t.stage==='P0';
    if(c.type==='technical')return t.stage==='P0'||['F2','F3','F4','F5','F6'].includes(t.stage);
    if(c.type==='retest')return RETEST_BASE.includes(t.id)||c.targets.toUpperCase().split(/[,;\s]+/).includes(t.id);
    return true;
  }
  function selectedByDepth(t){if(G.anchors.includes(t.id))return true;if(state.config.depth==='deep')return true;if(state.config.depth==='quick')return G.core.includes(t.id);
    const advanced=['P28','F26','F46','F55','F58'];
    // F04 (SoA) must never be silently removed from an ISO-focused assessment.
    return !advanced.includes(t.id) || (t.id==='F55'&&state.config.standards.includes('OWASP'));
  }
  function taskDefaultIncluded(t){const c=state.config;
    if(!selectedByType(t))return false;
    if(!hasRelevantTech(t))return false;
    if(c.type==='retest')return RETEST_BASE.includes(t.id)||c.targets.toUpperCase().split(/[,;\s]+/).includes(t.id);
    if(G.anchors.includes(t.id))return true;
    if(!selectedByDepth(t))return false;
    if(!(itemTopics(t.id).some(x=>c.topics.includes(x))))return false;
    if(!c.standards.length)return true;
    return c.standards.some(s=>Array.isArray(G.standards[s])&&G.standards[s].includes(t.id));
  }
  function included(t){const full=TASK_BY_ID[t.id]||t;const force=state.config.manual[full.id];return force==='include'||(force!=='exclude'&&taskDefaultIncluded(full));}
  const activeTasks=()=>ALL.filter(included);
  // Zakres wymagań jest niezależny od wykonania zadań. Przy retestach domyślnie
  // bierzemy kryteria powiązane ze wskazanymi ID, resztę można włączyć ręcznie.
  const frameworkRequirements=()=>R.filter(q=>state.config.standards.includes(q.frame));
  function criterionIncluded(q){
    const manual=state.config.criterionManual[q.id]?.mode;
    if(manual==='include')return true;
    if(manual==='exclude')return false;
    if(state.config.type!=='retest')return true;
    const targets=state.config.targets.toUpperCase().split(/[,;\s]+/).filter(Boolean);
    return targets.some(id=>(q.tasks||[]).includes(id));
  }
  const selectedRequirements=()=>frameworkRequirements().filter(criterionIncluded);
  const excludedRequirements=()=>frameworkRequirements().filter(q=>!criterionIncluded(q));
  function totals(){const tasks=activeTasks(),done=tasks.filter(t=>taskState(t.id).status==='done').length,na=tasks.filter(t=>taskState(t.id).status==='na').length,waiting=tasks.filter(t=>taskState(t.id).status==='waiting').length,nonconform=tasks.filter(t=>['partial','nonconform'].includes(taskState(t.id).assessment)).length;return {total:tasks.length,done,na,waiting,nonconform,eligible:tasks.length-na};}
  function reqTotals(){const req=selectedRequirements(),checked=req.filter(q=>!['unassessed','unknown'].includes(reqState(q.id).status)).length;return {total:req.length,checked,gaps:req.filter(q=>['partial','nonconform'].includes(reqState(q.id).status)).length};}
  function progressPct(d,t){return t?Math.round(100*d/t):0;}
  function statusClass(s){return ({done:'good',na:'neutral',progress:'info',waiting:'bad',conform:'good',partial:'warn',nonconform:'bad',unknown:'warn',notapp:'neutral'})[s]||'neutral';}
  function statusBadge(s){return `<span class="status-tag ${statusClass(s)}">${h(LABEL[s]||s)}</span>`;}
  function sourceTokens(t){return (t.refs||'').split(';').filter(Boolean);}
  function srcLinks(t){return sourceTokens(t).map(id=>SOURCE_BY_ID[id]?`<a class="source-label" href="${h(SOURCE_BY_ID[id].url)}" target="_blank" rel="noopener noreferrer" title="${h(SOURCE_BY_ID[id].title)}">${h(id)}</a>`:`<span class="source-label">${h(id)}</span>`).join('');}
  function quoteCsv(value){
    const text=String(value??'');
    const safe=/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/u.test(text)?"'"+text:text;
    return '"'+safe.replace(/"/g,'""')+'"';
  }
  function download(name,content,mime='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([content],{type:mime}));const el=document.createElement('a');el.href=url;el.download=name;el.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
  function filenameBase(project=state){
    return (project.config.name||project.config.org||'audyt').normalize('NFKD').replace(/\p{M}/gu,'')
      .replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'audyt';
  }
  function applyPreset(id){configurePreset(state,id);save();renderAll();}
  function presetCard(p,compact=false){return `<button class="preset-card ${compact?'compact':''} ${state.config.preset===p.id?'is-selected':''}" type="button" data-preset="${h(p.id)}"><span class="preset-icon">${({nis2:'§',discovery:'◎',retest:'↺',iso:'◈',technical:'▥',custom:'⚙'})[p.id]}</span><span class="preset-copy"><b>${h(p.name)}</b><small>${h(p.desc)}</small></span><span class="preset-chevron">→</span></button>`;}
  function renderPresets(){v('preset-cards').innerHTML=PRESETS.map(x=>presetCard(x)).join('');v('setup-presets').innerHTML=PRESETS.map(x=>presetCard(x,true)).join('');}
  function renderDashboard(){const t=totals(),r=reqTotals();v('dashboard-metrics').innerHTML=[['Zadania w planie',t.total],['Wykonane',t.done],['Wymagania wybrane',r.total],['Ustalenia',state.findings.length]].map(([name,num])=>`<div class="metric"><span>${h(name)}</span><strong>${num}</strong></div>`).join('');v('nav-progress').textContent=`${t.done}/${t.total}`;
    v('dashboard-stages').innerHTML=A.stages.filter(s=>s.tasks.some(t=>included(t))).map(s=>{const st=s.tasks.filter(included),d=st.filter(x=>taskState(x.id).status==='done').length;return `<div class="mini-stage"><span>${h(s.title.replace(/^\d+\.\s*/,''))}</span><b>${d}/${st.length}</b><div class="progress-track"><i style="width:${progressPct(d,st.length)}%"></i></div></div>`;}).join('')||'<p class="muted">Brak zadań. Skonfiguruj audyt.</p>';
  }
  function renderSetupControls(){const c=state.config;
    for(const [id,key] of Object.entries({'cfg-name':'name','cfg-org':'org','cfg-lead':'lead','cfg-sponsor':'sponsor','cfg-type':'type','cfg-depth':'depth','cfg-size':'size','cfg-legal':'legal','cfg-legal-evidence':'legalEvidence','cfg-scope':'scope','cfg-exclusions':'exclusions','cfg-period':'period','cfg-previous':'previous','cfg-targets':'targets'}))v(id).value=c[key]||'';
    v('standard-options').innerHTML=FRAMEWORKS.map(f=>`<label class="choice"><input type="checkbox" data-standard="${f.id}" ${c.standards.includes(f.id)?'checked':''}><span><b>${h(f.name)}</b><small>${h(f.subtitle)}</small></span><em>${h(f.kind)}</em></label>`).join('');
    v('topic-options').innerHTML=TOPICS.map(t=>`<label class="topic-choice"><input type="checkbox" data-topic="${t.id}" ${c.topics.includes(t.id)?'checked':''}><span>${t.glyph}</span><b>${h(t.name)}</b></label>`).join('');
    v('tech-options').innerHTML=[['cloud','Usługi chmurowe i SaaS'],['apps','Własne aplikacje i API'],['ot','Środowiska OT/ICS']].map(([k,name])=>`<label class="choice"><input type="checkbox" data-tech="${k}" ${c.tech[k]?'checked':''}><span><b>${name}</b><small>Dołącz odrębne zadania specjalistyczne</small></span></label>`).join('');
    renderSetupSummary();
  }
  function renderSetupSummary(){const t=totals(),c=state.config;
    const type=({discovery:'Rozpoznanie',compliance:'Zgodność / luki',integrated:'Przekrojowy',technical:'Techniczny',retest:'Sprawdzenie po zmianach'})[c.type]||c.type;
    const warnings=[];if(c.standards.includes('KSC')&&c.legal==='unknown')warnings.push('Status podmiotu KSC wymaga potwierdzenia');if(c.type==='retest'&&!c.targets.trim())warnings.push('Do ponownego sprawdzenia wskaż ID poprzednich ustaleń/zadań');if(c.depth==='quick'&&c.standards.some(x=>['KSC','DORA','EU2690','ISO'].includes(x)))warnings.push('Szybki przegląd nie daje podstaw do wniosku o pełnej zgodności');
    v('setup-summary').innerHTML=`<div><span class="kicker">AKTYWNY PROGRAM</span><strong>${h(type)}</strong><small>${h(c.standards.join(' + ')||'Bez przypisanego standardu')} • ${h(Object.hasOwn(DEPTH,c.depth)?DEPTH[c.depth]:c.depth)} • ${h(Object.hasOwn(SIZE,c.size)?SIZE[c.size]:c.size)} • ${selectedRequirements().length} kryteriów</small></div><div><strong>${t.total}</strong><small>zadań w bieżącym planie</small></div>${warnings.length?`<div class="setup-warnings">${warnings.map(x=>`<span>⚠ ${h(x)}</span>`).join('')}</div>`:''}`;
  }
  function taskMarkup(t,isIncluded){const s=taskState(t.id),steps=G.steps[t.id]||[],done=s.checks.filter(Boolean).length;
    const warning=t.permission==='approval'?'<div class="test-warning"><b>Wymaga odrębnej zgody:</b> aktywny test lub ingerencja mogą wpłynąć na produkcję. Najpierw potwierdź pisemne RoE i zgodę właściciela.</div>':'';
    const tip=t.tip?`<p class="guidance-tip"><b>Wskazówka:</b> ${h(t.tip)}</p>`:'';
    const tags=itemTopics(t.id).map(x=>TOPICS.find(z=>z.id===x)?.name||x).slice(0,3);
    return `<article class="work-item ${openTasks.has(t.id)?'is-open':''} ${isIncluded?'':'outside'}" data-id="${h(t.id)}">
      <div class="work-head"><button type="button" class="work-toggle" aria-expanded="${openTasks.has(t.id)}" aria-label="${h('Otwórz '+t.name)}"><span class="task-id">${h(t.id)}</span><span class="task-title"><b>${h(t.name)}</b><small>${h(tags.join(' · '))}</small></span><span class="task-state">${statusBadge(s.status)}</span><span class="progress-mini">${done}/${steps.length}</span><span class="chevron">⌄</span></button></div>
      <div class="work-body">
        <div class="task-detail-top"><div><div class="field-kicker">CO I DLACZEGO SPRAWDZIĆ</div><p>${h(t.action)}</p>${tip}</div><div><div class="field-kicker">JAKI DOWÓD POWINIEN POWSTAĆ?</div><p>${h(t.evidence)}</p><div class="source-line">Źródła: ${srcLinks(t)}</div></div></div>
        ${warning}
        <div class="task-checks"><div class="task-check-head"><b>Krótka lista kontrolna</b><small>Podpunkty pomagają wykonać pracę, ale same nie rozstrzygają zgodności.</small></div>${steps.map((step,i)=>`<label class="step-row ${s.checks[i]?'checked':''}"><input type="checkbox" class="task-step" id="task-${h(t.id)}-step-${i}" data-index="${i}" ${s.checks[i]?'checked':''}><span class="step-number">0${i+1}</span><span>${h(step)}</span></label>`).join('')}</div>
        <div class="task-fields"><div class="field"><label for="task-${h(t.id)}-status">Etap wykonania</label><select id="task-${h(t.id)}-status" data-task-field="status">${[['new','Nie rozpoczęto'],['progress','W trakcie'],['waiting','Brak dowodu / blokada'],['done','Wykonano sprawdzenie'],['na','Poza zakresem / N/D']].map(([k,title])=>`<option value="${k}" ${s.status===k?'selected':''}>${h(title)}</option>`).join('')}</select></div>
          <div class="field"><label for="task-${h(t.id)}-assessment">Ocena wyniku</label><select id="task-${h(t.id)}-assessment" data-task-field="assessment">${[['unassessed','Nie oceniono'],['conform','Zgodne w badanej próbie'],['partial','Częściowe'],['nonconform','Niezgodne'],['unknown','Nie można ocenić - brak dowodów'],['notapp','Nie dotyczy']].map(([k,title])=>`<option value="${k}" ${s.assessment===k?'selected':''}>${h(title)}</option>`).join('')}</select></div>
          <div class="field"><label for="task-${h(t.id)}-owner">Audytor / właściciel</label><input id="task-${h(t.id)}-owner" data-task-field="owner" value="${h(s.owner)}" placeholder="Osoba, która potwierdziła"></div>
          <div class="field"><label for="task-${h(t.id)}-evidence">ID dowodu (rejestr)</label><input id="task-${h(t.id)}-evidence" data-task-field="evidence" value="${h(s.evidence)}" placeholder="E-003, E-008"></div>
          <div class="field field-wide"><label for="task-${h(t.id)}-sample">Populacja, próba i okres</label><input id="task-${h(t.id)}-sample" data-task-field="sample" value="${h(s.sample)}" placeholder="np. 5 z 20 kont admin, październik 2026"></div>
          <div class="field field-wide"><label for="task-${h(t.id)}-notes">Obserwacje, wynik testu, uzasadnienie oceny</label><textarea id="task-${h(t.id)}-notes" data-task-field="notes" rows="3" placeholder="Co stwierdzono? Co potwierdza wynik?">${h(s.notes)}</textarea></div>
          <div class="field field-wide"><label for="task-${h(t.id)}-reason">Uzasadnienie N/D lub ograniczeń</label><input id="task-${h(t.id)}-reason" data-task-field="reason" value="${h(s.reason)}" placeholder="Wypełnij, gdy zadanie/kryterium nie dotyczy lub zakres jest ograniczony"></div>
          <label class="verified-toggle"><input type="checkbox" id="task-${h(t.id)}-verified" data-task-field="verified" ${s.verified?'checked':''}> Sprawdzono spójność dowodów i zakres próby</label>
        </div>
        <div class="task-actions"><button class="btn btn-light btn-sm" type="button" data-action="new-evidence">+ Dodaj dowód</button><button class="btn btn-light btn-sm" type="button" data-action="new-finding">+ Utwórz ustalenie</button><button class="btn ${isIncluded?'btn-outline-danger':'btn-outline'} btn-sm" type="button" data-action="scope">${isIncluded?'Usuń z planu':'Włącz do planu'}</button></div>
        ${state.config.manual[t.id]==='exclude'?`<p class="muted tiny">Wyłączone ręcznie. Uzasadnienie: ${h(s.reason||'BRAK - dodaj uzasadnienie')}</p>`:''}
      </div>
    </article>`;
  }
  function renderPlan(){const t=totals(),all=v('show-all-tasks').checked,filter=v('task-filter').value,query=v('task-search').value.trim().toLocaleLowerCase('pl');
    const list=ALL.filter(x=>all||included(x));
    v('plan-overview').innerHTML=`<div class="plan-stat"><span>W planie</span><strong>${t.total}</strong></div><div class="plan-stat"><span>Sprawdzone</span><strong>${t.done}</strong></div><div class="plan-stat"><span>Blokady</span><strong>${t.waiting}</strong></div><div class="plan-stat"><span>Niezgodności w zadaniach</span><strong>${t.nonconform}</strong></div><div class="plan-progress"><div class="progress-track"><i style="width:${progressPct(t.done,t.eligible)}%"></i></div><small>${progressPct(t.done,t.eligible)}% wykonanych czynności z zakresu (pomijając N/D). To metryka postępu, nie zgodności.</small></div>`;
    let count=0;
    v('stage-list').innerHTML=A.stages.map(stage=>{const st=list.filter(x=>x.stage===stage.id).filter(x=>!query||[x.id,x.name,x.action,x.refs].join(' ').toLocaleLowerCase('pl').includes(query)).filter(x=>{
      const s=taskState(x.id);if(filter==='pending')return s.status!=='done'&&s.status!=='na';if(filter==='blocked')return s.status==='waiting'||s.assessment==='unknown';if(filter==='issues')return ['partial','nonconform'].includes(s.assessment);return true;
    });if(!st.length)return '';count+=st.length;const selected=stage.tasks.filter(included);return `<section class="stage-block"><div class="stage-header"><div><span class="stage-id">${h(stage.id)}</span><div><h2>${h(stage.title)}</h2><p>${h(stage.goal)}</p></div></div><span class="stage-counter">${selected.filter(x=>taskState(x.id).status==='done').length}/${selected.length} wykonano</span></div><div class="stage-gate"><b>Kryterium zamknięcia etapu:</b> ${h(stage.gate)}</div>${st.map(x=>taskMarkup(x,included(x))).join('')}</section>`;}).join('');
    if(!count)v('stage-list').innerHTML='<div class="empty-state"><h3>Brak zadań dla wybranego zakresu</h3><p>Sprawdź ustawienia audytu, filtry, technologie lub identyfikatory do ponownego sprawdzenia.</p><a href="#setup" class="btn btn-accent">Przejdź do konfiguratora</a></div>';
  }
  function renderCriteria(){const active=selectedRequirements(),q=v('req-search').value.trim().toLocaleLowerCase('pl'),filter=v('req-filter').value;
    v('criteria-warning').innerHTML=`<b>Interpretacja:</b> ${state.config.standards.includes('KSC')?'KSC/NIS2: wymagania rozbito na punkty pomocnicze; obowiązywanie zależy od kwalifikacji prawnej podmiotu. ':' '}ISO, CIS i OWASP: listy mają charakter orientacyjnego indeksu, a pełna ocena wymaga właściwych oryginalnych wymagań i metodyki. „N/D” wymaga powodu. Nie oceniaj firmy jako zgodnej wyłącznie na podstawie odhaczonych zadań.`;
    const all=v('show-all-criteria').checked;
    const shown=(all?frameworkRequirements():active).filter(r=>!q||[r.title,r.reference,r.question].join(' ').toLocaleLowerCase('pl').includes(q)).filter(r=>{const s=reqState(r.id);return filter==='open'?s.status==='unassessed':filter==='gaps'?['partial','nonconform','unknown'].includes(s.status):true;});
    v('requirements-list').innerHTML=shown.map(r=>{const s=reqState(r.id),taskLinks=r.tasks.filter(id=>TASK_BY_ID[id]).map(id=>`<button class="pill-action" type="button" data-jump="${h(id)}">${h(id)}</button>`).join('');return `<article class="requirement ${criterionIncluded(r)?'':'outside'}" data-req="${h(r.id)}">
      <div class="requirement-scope"><span class="chip">${criterionIncluded(r)?'W zakresie oceny':'Wyłączone z zakresu ponownego sprawdzenia'}</span><button class="btn btn-light btn-sm" type="button" data-criterion-scope="${h(r.id)}">${criterionIncluded(r)?'Wyłącz kryterium':'Włącz kryterium'}</button></div>
      ${!criterionIncluded(r)&&state.config.criterionManual[r.id]?.reason?`<p class="muted tiny"><b>Powód wyłączenia:</b> ${h(state.config.criterionManual[r.id].reason)}</p>`:''}<div class="req-heading"><span class="req-id">${h(r.id)}</span><div><b>${h(r.title)}</b><small>${h(r.reference)}</small></div>${statusBadge(s.status)}</div><p class="req-question">${h(r.question)}</p><div class="req-evidence"><b>Przykładowy dowód:</b> ${h(r.evidence)}<div class="task-chips">Powiązane zadania: ${taskLinks||'brak'}</div>${r.notice?`<small>${h(r.notice)}</small>`:''}</div><div class="req-form"><div class="field"><label for="req-${h(r.id)}-applicability">Odnosi się do badanego zakresu?</label><select id="req-${h(r.id)}-applicability" data-req-field="applicability"><option value="pending" ${s.applicability==='pending'?'selected':''}>Do potwierdzenia</option><option value="yes" ${s.applicability==='yes'?'selected':''}>Tak</option><option value="no" ${s.applicability==='no'?'selected':''}>Nie (z uzasadnieniem)</option></select></div><div class="field"><label for="req-${h(r.id)}-status">Wynik w zbadanym zakresie</label><select id="req-${h(r.id)}-status" data-req-field="status">${[['unassessed','Nie oceniono'],['conform','Zgodne w próbie'],['partial','Częściowo'],['nonconform','Niezgodne'],['unknown','Za mało dowodów'],['notapp','Nie dotyczy']].map(([id,name])=>`<option value="${id}" ${s.status===id?'selected':''}>${name}</option>`).join('')}</select></div><div class="field"><label for="req-${h(r.id)}-evidence">ID dowodów</label><input id="req-${h(r.id)}-evidence" data-req-field="evidence" value="${h(s.evidence)}" placeholder="E-003"></div><div class="field"><label for="req-${h(r.id)}-notes">Uzasadnienie, wyjątki i zakres próby</label><textarea id="req-${h(r.id)}-notes" data-req-field="notes" rows="2">${h(s.notes)}</textarea></div></div></article>`;}).join('')||'<div class="empty-state"><h3>Brak kryteriów</h3><p>Wybierz co najmniej jeden standard w konfiguratorze albo zmień filtr.</p></div>';
  }
  function renderEvidence(){v('evidence-count').textContent=state.evidence.length+' rekordów';v('evidence-table').innerHTML=state.evidence.length?`<div class="table-wrap"><table><thead><tr><th>ID / zadanie</th><th>Opis</th><th>Źródło / lokalizacja</th><th>Data</th><th>Weryfikacja</th><th></th></tr></thead><tbody>${state.evidence.map((x,i)=>`<tr><td><b>${h(x.id)}</b><br><small>${h(x.task)}</small></td><td>${h(x.title)}<br><small>${h(x.kind)} • ${h(x.classification)}</small></td><td>${h(x.owner)}<br><small>${h(x.location)}</small></td><td>${h(x.date)}</td><td>${x.verified?'<span class="status-tag good">Potwierdzone źródło</span>':'<span class="status-tag warn">Do sprawdzenia</span>'}</td><td><button class="btn btn-outline-danger btn-sm" type="button" data-delete-evidence="${i}">Usuń</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state">Brak zapisanych dowodów. Dodaj pierwszy identyfikator do rejestru.</div>';
  }
  function riskGrade(f){const value=n(f.likelihood,1)*n(f.impact,1);return {value,name:value>=17?'Krytyczne':value>=10?'Wysokie':value>=5?'Umiarkowane':'Niskie',cls:value>=17?'critical':value>=10?'high':value>=5?'med':'low'};}
  function nextFindingId(){
    const ids=new Set(state.findings.map(item=>item.id.toLowerCase()));
    let number=1,id;
    do{id='U-'+String(number++).padStart(3,'0');}while(ids.has(id.toLowerCase()));
    return id;
  }
  function riskOptions(value){
    return [1,2,3,4,5].map(number=>`<option value="${h(number)}"${number===value?' selected':''}>${h(number)}</option>`).join('');
  }
  function renderFindings(){followup.renderBoard();v('findings-count').textContent=state.findings.length+' ustaleń';
    v('findings-list').innerHTML=state.findings.length?state.findings.map((f,i)=>{const risk=riskGrade(f);return `<article class="finding" data-finding="${i}"><div class="finding-top"><div><span class="task-id">${h(f.id)}</span><h3>${h(f.title)}</h3><p class="muted">${h(f.criterion)} • ${h(f.task)}</p></div><span class="risk-score ${risk.cls}" data-risk-score>${risk.value}/25 · ${risk.name}</span></div><p><b>Wpływ:</b> ${h(f.impactText||'Nie opisano')}</p><div class="finding-edit-grid">
    <div class="field"><label for="finding-${h(i)}-likelihood">Prawdopodobieństwo (1–5)</label><select id="finding-${h(i)}-likelihood" data-finding-field="likelihood">${riskOptions(f.likelihood)}</select></div>
    <div class="field"><label for="finding-${h(i)}-impact">Skutek (1–5)</label><select id="finding-${h(i)}-impact" data-finding-field="impact">${riskOptions(f.impact)}</select></div>
    <div class="field field-wide"><label for="finding-${h(i)}-observation">Opis ustalenia</label><textarea id="finding-${h(i)}-observation" data-finding-field="observation" rows="2">${h(f.observation)}</textarea></div><div class="field"><label for="finding-${h(i)}-evidence">Identyfikatory dowodów</label><input id="finding-${h(i)}-evidence" data-finding-field="evidence" value="${h(f.evidence)}"></div><div class="field"><label for="finding-${h(i)}-status">Status</label><select id="finding-${h(i)}-status" data-finding-field="status">${[['open','Otwarte'],['doing','W realizacji'],['retest','Do ponownego sprawdzenia'],['closed','Zamknięte po ponownym sprawdzeniu'],['accepted','Ryzyko zaakceptowane']].map(([key,name])=>`<option value="${key}" ${f.status===key?'selected':''}>${name}</option>`).join('')}</select></div><div class="field"><label for="finding-${h(i)}-owner">Właściciel działania</label><input id="finding-${h(i)}-owner" data-finding-field="owner" value="${h(f.owner)}"></div><div class="field"><label for="finding-${h(i)}-due">Termin</label><input id="finding-${h(i)}-due" type="date" data-finding-field="due" value="${h(f.due)}"></div>${f.retestEvidence?`<div class="field"><label for="finding-${h(i)}-retestEvidence">Dowód ze starszej notatki</label><input id="finding-${h(i)}-retestEvidence" data-finding-field="retestEvidence" value="${h(f.retestEvidence||'')}" placeholder="E-011 + wynik ponownego sprawdzenia"></div>`:''}<div class="field field-wide"><label for="finding-${h(i)}-action">Działanie i kryterium zamknięcia</label><textarea id="finding-${h(i)}-action" data-finding-field="action" rows="2">${h(f.action)}</textarea></div>${f.managementResponse?`<div class="field field-wide"><label for="finding-${h(i)}-managementResponse">Wcześniejsza notatka kierownictwa</label><textarea id="finding-${h(i)}-managementResponse" data-finding-field="managementResponse" rows="2">${h(f.managementResponse||'')}</textarea></div>`:''}</div>${followup.markup(f)}<div class="finding-actions"><button class="btn btn-outline-danger btn-sm" type="button" data-delete-finding="${i}">Usuń ustalenie</button></div></article>`;}).join(''):'<div class="empty-state">Brak ustaleń. Możesz dodać problem ręcznie lub z poziomu zadania.</div>';
  }
  function renderLibrary(){v('docs-grid').innerHTML=DOCS.map(([id,title,desc])=>`<article class="doc-card"><div class="doc-icon">PDF</div><div><b>${h(title)}</b><p>${h(desc)}</p><small>PDF z polami + edytowalny Markdown</small></div><div class="doc-links"><button class="btn btn-light btn-sm" data-pdf="dodatki/formularze_pdf/${id}.pdf" data-title="${h(title)}" type="button">Podgląd</button><a class="btn btn-light btn-sm" href="dodatki/formularze_pdf/${id}.pdf" download>Pobierz PDF</a><a href="dodatki/szablony_edytowalne/${id}.md" download>Wzór MD ↓</a></div></article>`).join('');}
  function renderHelp(){const rows=[
    ['00','Praca ze standardem','Na początku ustal właściwą wersję i pełne wymagania. W przypadku norm ISO sprawdź legalną kopię; w KSC odczytaj przepisy krajowe i kwalifikację podmiotu.'],
    ['01','Pierwsza rozmowa z IT','Zapytaj o topologię, adresację, VLAN, firewall, wirtualizację, chmurę, dostawców, kopie zapasowe i największe znane problemy. Nie zaczynaj od skanowania.'],
    ['02','Zbieraj dowody trzema ścieżkami','Dobrze: wywiad + dokument/polityka + stan techniczny/test. Każdą informację przypisz do ID dowodu i daty.'],
    ['03','Najpierw dostęp read-only','Eksporty konfiguracji, CMDB, DHCP, ARP, logów i ustawień są często wystarczające do rozpoznania. Zmianę konfiguracji zostaw administratorowi.'],
    ['04','MFA: sprawdź wyjątki','Lista polityk MFA nie wystarcza. Sprawdź próbkę administratorów, dostęp zdalny, konta awaryjne i rzeczywiste wyjątki.'],
    ['05','Kopie zapasowe. Zapytaj o odtworzenie','Pomyślne wykonanie kopii nie potwierdza przywrócenia usługi. Szukaj protokołu restore, czasów RTO/RPO, zależności i izolacji kopii.'],
    ['06','Firewall: kontekst reguł','Reguła może być ryzykowna, ale też krytyczna biznesowo. Ustal właściciela, uzasadnienie, ekspozycję, logowanie i plan wycofania.'],
    ['07','Próba i ograniczenia','Zapisz populację, sposób doboru i okres. Przy 5 kontach z 300 nie twierdź, że sprawdzono całą organizację.'],
    ['08','NIS2 to nie przycisk zgodności','Dyrektywa wyznacza obszary, ale obowiązek polskiej firmy wynika z KSC i odpowiednich przepisów. Nie stosuj terminów bez sprawdzenia statusu.'],
    ['09','CIS, NIST i ISO mają inne role','NIST CSF wspiera zarządzanie ryzykiem, CIS daje praktyczne zabezpieczenia, ISO 27001 zawiera wymagania SZBI; nie zamieniaj dobrowolnych praktyk w obowiązki ustawowe.'],
    ['10','Incydenty mają różne zegary','KSC i RODO mają odmienne progi, odbiorców i terminy. Zbadaj gotowość proceduralną osobno i zweryfikuj obowiązki sektorowe.'],
    ['11','OT wymaga ostrożności','W ICS/PLC najpierw tryb pasywny. Testy aktywne mogą naruszyć bezpieczeństwo procesowe; uzyskaj osobną zgodę właściciela OT.'],
    ['12','W raporcie pisz o dowodach','Każde ustalenie: kryterium → obserwacja → dowód → wpływ → działanie → właściciel → termin → ponowne sprawdzenie.'],
    ['13','Sprawdź poprawkę przed zamknięciem','Udokumentowana zmiana nie musi być skuteczna. Zapisz próbę weryfikacyjną i zaakceptowane ryzyko rezydualne.'],
    ['14','Archiwizuj projekt','Przechowuj eksport JSON w szyfrowanym repozytorium z kontrolą dostępu. localStorage w przeglądarce nie jest zaszyfrowanym sejfem.'],
    ['15','Raport PDF bez chmury','Otwórz Raport, sprawdź kontrolę jakości, wybierz zakres aneksu i kliknij Generuj / zapisz PDF. W oknie drukowania wybierz Zapisz jako PDF.']
  ];v('help-grid').innerHTML=rows.map(([id,name,desc])=>`<article class="help-card"><small>${id} / WSKAZÓWKA</small><h3>${h(name)}</h3><p>${h(desc)}</p></article>`).join('');}
  function renderSources(){v('source-cards').innerHTML=A.sources.map(s=>`<article class="source-card"><span class="chip">${h(s.type)}</span><h3>${h(s.title)}</h3><p>${h(s.note)}</p><small>${h(s.org)} • zweryfikowano: ${h(s.verified)}</small><a href="${h(s.url)}" rel="noopener noreferrer" target="_blank">Oficjalne źródło ↗</a></article>`).join('');}
  function nextEvidenceId(){
    const used=new Set(state.evidence.map(item=>item.id.toLowerCase()));
    let next=1;
    while(used.has('e-'+String(next).padStart(3,'0')))next++;
    return 'E-'+String(next).padStart(3,'0');
  }
  function quality(){const t=activeTasks(),r=selectedRequirements(),problems=[];
    const add=(sev,title,detail)=>problems.push({sev,title,detail});
    if(!state.config.org||!state.config.lead||!state.config.sponsor)add('bad','Nieuzupełniona karta zlecenia','Organizacja, audytor i sponsor są wymagane w raporcie.');
    if(!state.config.scope.trim())add('warn','Brakuje opisu zakresu','Wpisz jednostki, systemy, granice i okres w konfiguratorze.');
    if(!['done'].includes(taskState('P01').status)||!taskState('P01').evidence.trim())add('bad','Brak zatwierdzonego mandatu','Udokumentuj P01 i powiąż z dowodem upoważnienia.');
    if(!['done'].includes(taskState('P04').status)||!taskState('P04').evidence.trim())add('bad','Brak potwierdzenia RoE','Zadanie P04 powinno odwoływać się do zaakceptowanych zasad prac.');
    if(state.config.standards.includes('KSC')&&state.config.legal==='unknown')add('bad','Nieustalona kwalifikacja KSC','Przed formalną konkluzją ustal status, sektor, wyjątki i właściwe terminy.');
    if(state.config.standards.includes('KSC')&&state.config.legal!=='unknown'&&!state.config.legalEvidence.trim())add('warn','Kwalifikacja KSC bez uzasadnienia','Wpisz podstawę prawną, źródło i osobę potwierdzającą.');
    if(state.config.depth==='quick'&&state.config.standards.some(x=>['KSC','ISO','DORA','EU2690'].includes(x)))add('warn','Ograniczone pokrycie','Szybki przegląd nie daje podstaw do wniosku o pełnej zgodności.');
    if(state.config.type==='retest'&&!state.config.targets.trim())add('bad','Brak zadań do ponownego sprawdzenia','Wskaż ID objęte powtórną weryfikacją.');
    const notDone=t.filter(x=>!['done','na'].includes(taskState(x.id).status));if(notDone.length)add('warn',`Nieukończone zadania: ${notDone.length}`,'Raport musi ujawnić ograniczenie zakresu.');
    const doneNoEvidence=t.filter(x=>taskState(x.id).status==='done'&&!taskState(x.id).evidence.trim());if(doneNoEvidence.length)add('warn',`Wykonane zadania bez ID dowodu: ${doneNoEvidence.length}`,'Uzupełnij odwołania w kartach zadań.');
    const doneWithoutChecks=t.filter(x=>taskState(x.id).status==='done'&&taskState(x.id).checks.some(y=>!y));if(doneWithoutChecks.length)add('warn',`Niepełne mikrolisty kontrolne: ${doneWithoutChecks.length}`,'Wykonaj podpunkty lub udokumentuj uzasadnienie pominięcia.');
    const gaps=t.filter(x=>taskState(x.id).status==='done'&&taskState(x.id).assessment==='unassessed');if(gaps.length)add('warn',`Brak oceny po sprawdzeniu: ${gaps.length}`,'Status wykonania i wynik zgodności to dwa różne pola.');
    const naMissing=t.filter(x=>['na'].includes(taskState(x.id).status)&&!taskState(x.id).reason.trim());if(naMissing.length)add('warn',`N/D bez uzasadnienia: ${naMissing.length}`,'Każde wyłączenie wymaga podania powodu.');
    const tasksExcluded=Object.entries(state.config.manual).filter(([id,mode])=>mode==='exclude'&&!taskState(id).reason.trim());
    if(tasksExcluded.length)add('warn',`Ręcznie wyłączone zadania bez uzasadnienia: ${tasksExcluded.length}`,'Każdą zmianę zakresu potwierdź z klientem i zapisz przyczynę.');
    const unassessed=r.filter(x=>['unassessed','unknown'].includes(reqState(x.id).status));if(unassessed.length)add('warn',`Brak jednoznacznej oceny wymagań: ${unassessed.length}`,'Wyraźnie oznacz brak dowodu; nie raportuj automatycznej zgodności.');
    const reqNoReason=r.filter(x=>reqState(x.id).status==='notapp'&&!reqState(x.id).notes.trim());if(reqNoReason.length)add('warn',`Kryteria N/D bez powodu: ${reqNoReason.length}`,'Uzasadnij brak zastosowania wymagania.');
    const missingScopeReason=excludedRequirements().filter(x=>state.config.criterionManual[x.id]?.mode==='exclude'&&!state.config.criterionManual[x.id]?.reason?.trim());
    if(missingScopeReason.length)add('warn',`Wyłączone wymagania bez uzasadnienia: ${missingScopeReason.length}`,'Każde świadome wyłączenie powinno mieć podstawę i zatwierdzenie zakresu.');
    if(state.config.type==='retest'&&state.config.targets.trim()=== ''&&r.length===0)add('warn','Brak kryteriów ponownego sprawdzenia','Wpisz identyfikatory poprawek lub jawnie wybierz kryteria do powtórnej oceny.');
    const completed=t.filter(x=>taskState(x.id).status==='done');
    const unverified=completed.filter(x=>!taskState(x.id).verified);
    if(unverified.length)add('warn',`Sprawdzenia bez potwierdzenia dowodu i próby: ${unverified.length}`,'W karcie zadania potwierdź weryfikację i opisz sposób pozyskania dowodu oraz badaną próbę.');
    const incompleteActions=state.findings.filter(x=>['open','doing','retest'].includes(x.status)&&(!x.action.trim()||!x.owner.trim()||!x.due.trim()));
    if(incompleteActions.length)add('warn',`Ustalenia bez kompletnego planu działań: ${incompleteActions.length}`,'Uzupełnij działanie, kryterium zamknięcia, właściciela i termin albo odnotuj uzgodnioną decyzję.');
    const unapprovedRisk=state.findings.filter(x=>x.status==='accepted'&&!latestClosingDecision(x));
    if(unapprovedRisk.length)add('warn',`Akceptacje ryzyka bez decyzji: ${unapprovedRisk.length}`,'Zapisz osobę uprawnioną, datę i odwołanie do formalnej akceptacji.');
    const missingRetest=state.findings.filter(x=>x.status==='closed'&&!latestClosingDecision(x));if(missingRetest.length)add('warn',`Zamknięcia bez dowodu ponownego sprawdzenia: ${missingRetest.length}`,'Zapisz test po zmianie i jego wynik.');
    if(!state.report.summary.trim())add('warn','Brak podsumowania dla kierownictwa','Opisz najważniejsze wnioski, ograniczenia i decyzje.');
    if(!state.report.approved.trim())add('warn','Brak osoby zatwierdzającej','Raport roboczy powinien to jasno wskazywać.');
    return problems;
  }
  function renderQuality(){const items=quality();v('quality-gates').innerHTML=items.length?`<div class="quality-summary"><b>${items.length} elementów do rozpatrzenia</b><small>To checklista wydania, nie mechanizm potwierdzania zgodności.</small></div>${items.map(x=>`<div class="quality-row ${x.sev}"><span>${x.sev==='bad'?'!':'i'}</span><div><b>${h(x.title)}</b><small>${h(x.detail)}</small></div></div>`).join('')}`:'<div class="quality-ok"><b>Podstawowe kontrole jakości spełnione.</b><p>Pozostaje odpowiedzialny przegląd merytoryczny, zakresu i formalnych wymagań przez audytora.</p></div>';
  }
  function printedDate(){return new Date().toLocaleString('pl-PL',{dateStyle:'long',timeStyle:'short'});}
  function printableText(x,placeholder='Nie podano'){return h(String(x||'').trim()||placeholder).replace(/\n/g,'<br>');}
  function fullFindingTrace(finding,preview){
    const source=questionSource(finding,state.learning.programs);
    const assessment=finding.assessment??source?.program.answers[finding.questionId];
    const ids=state.evidence.map(item=>item.id);
    const proof=value=>evidenceReferences(value,ids).map(ref=>{
      const index=ids.indexOf(ref.id);
      return index>=0&&!preview?`<a href="#full-evidence-${h(index)}">${h(ref.id)}</a>`:h(ref.id)+(ref.known?'':' (brak w rejestrze)');
    }).join(', ')||'Nie podano';
    return (finding.questionId?`<p><b>Pytanie i ocena:</b> ${h(finding.questionId)} · ${h(source?.program.template.name??'Moduł nieustalony')}<br>
      ${printableText(source?.question.question??finding.title)} · ${h(results[assessment?.status]??'Brak zapisu')}${finding.assessment?' (w chwili utworzenia ustalenia)':''}<br>
      <b>Uzasadnienie:</b> ${printableText(assessment?.note)} · <b>Dowody oceny:</b> ${proof(assessment?.evidence)}</p>`:'')+
      ((finding.decisions??[]).length?`<p><b>Historia decyzji:</b></p><ul class="pdf-list">${finding.decisions.map(decision=>
        `<li>${h(decisionLabel(decision))} · ${h(decision.date)} · ${h(decision.actor)}<br>${printableText(decision.note)}
        ${decision.kind==='retest'?'<br>Dowód: '+proof(decision.evidence):''}</li>`).join('')}</ul>`:'')+
      (['closed','accepted'].includes(finding.status)&&!latestClosingDecision(finding)?'<p>Wcześniejszy status. Brak pełnego zapisu decyzji.</p>':'');
  }
  function reportBody(withAppendix=true,preview=false){const c=state.config,p=state.report,t=activeTasks(),rt=selectedRequirements(),stat=totals(),rs=reqTotals(),checks=quality();
    const selectedSources=new Set(['KSC26','NIS2','ISO19011']);for(const x of t)sourceTokens(x).forEach(y=>selectedSources.add(y));
    const legal=({unknown:'Nieustalony - wymaga weryfikacji',key:'Podmiot kluczowy (wg kwalifikacji klienta)',important:'Podmiot ważny (wg kwalifikacji klienta)',none:'Poza KSC (wg kwalifikacji klienta)'})[c.legal]||'Nieustalony';
    const name=printableText(c.name||'Raport z audytu cyberbezpieczeństwa','Raport z audytu cyberbezpieczeństwa');
    const phaseName=({discovery:'Audyt wstępny',compliance:'Ocena zgodności / przegląd luk',integrated:'Audyt przekrojowy',technical:'Audyt techniczny',retest:'Sprawdzenie po zmianach'})[c.type]||c.type;
    const summary=`<section class="pdf-cover"><div class="pdf-brand">CYBERAUDIT STUDIO <span>2026 / ${h(APP_VERSION)}</span></div><div class="pdf-kicker">RAPORT AUDYTU BEZPIECZEŃSTWA</div><h1>${name}</h1><p class="pdf-sub">${h(phaseName)} • ${h(c.standards.join(', ')||'Kryteria zlecenia')}</p><div class="pdf-meta-grid"><div><small>ORGANIZACJA</small><b>${printableText(c.org)}</b></div><div><small>AUDYTOR / ZESPÓŁ</small><b>${printableText(c.lead)}</b></div><div><small>SPONSOR</small><b>${printableText(c.sponsor)}</b></div><div><small>DATA OPRACOWANIA</small><b>${h(printedDate())}</b></div><div><small>KLASYFIKACJA</small><b>${printableText(p.classification)}</b></div><div><small>STATUS RAPORTU</small><b>${p.approved?'Do potwierdzenia podpisem / '+h(p.approved):'Roboczy - niezatwierdzony'}</b></div></div><p class="pdf-cover-note">Wnioski obowiązują wyłącznie w granicach udokumentowanego zakresu i zbadanej próby. Projekt nie zastępuje audytu ustawowego ani certyfikacyjnego.</p></section>`;
    const overview=`<section class="pdf-section"><h2>1. Podsumowanie dla kierownictwa</h2><p>${printableText(p.summary,'Podsumowanie nie zostało jeszcze sporządzone.')}</p><div class="pdf-kpis"><div><b>${stat.total}</b><small>zadań w planie</small></div><div><b>${stat.done}</b><small>wykonanych</small></div><div><b>${rs.checked}/${rs.total}</b><small>ocenionych kryteriów</small></div><div><b>${state.findings.length}</b><small>ustaleń</small></div></div><p><b>Konkluzja wybrana przez audytora:</b> ${h(({none:'Nie zatwierdzono konkluzji',limited:'Ocena ograniczona, wymagane dalsze dowody',gaps:'W badanym zakresie stwierdzono niezgodności lub luki',scoped:'W badanej próbie nie stwierdzono istotnych odstępstw'})[p.conclusion]||p.conclusion)}.</p><p class="pdf-warning"><b>Ograniczenie:</b> żadna metryka „wykonano” lub „oceniono” nie jest procentem zgodności. Wynik opiera się na dowodach i przyjętych kryteriach.</p></section>`;
    const manuallyExcluded=Object.keys(c.manual).filter(id=>c.manual[id]==='exclude');
    const excluded=excludedRequirements();
    const scopeNote=excluded.length?`<p><b>Wymagania poza zakresem oceny (${excluded.length}):</b></p><ul class="pdf-list">${excluded.map(x=>`<li><b>${h(x.id)} ${h(x.title)}:</b> ${printableText(state.config.criterionManual[x.id]?.reason,state.config.type==='retest'?'Poza kryteriami przypisanymi do Identyfikatory zadań do ponownego sprawdzenia':'Nie podano uzasadnienia')}</li>`).join('')}</ul>`:'<p><b>Wyłączone kryteria:</b> brak.</p>';
    const tasksExcludedNote=manuallyExcluded.length?`<p><b>Ręcznie wyłączone zadania (${manuallyExcluded.length}):</b></p><ul class="pdf-list">${manuallyExcluded.map(id=>`<li><b>${h(id)} ${h(TASK_BY_ID[id]?.name||'')}:</b> ${printableText(taskState(id).reason,'Nie podano uzasadnienia')}</li>`).join('')}</ul>`:'';
    const methodology=`<section class="pdf-section"><h2>2. Zakres, kryteria i metodologia</h2><table class="pdf-table"><tbody>
      <tr><th>Cel / typ</th><td>${h(phaseName)}</td></tr><tr><th>Głębokość</th><td>${h(Object.hasOwn(DEPTH,c.depth)?DEPTH[c.depth]:c.depth)} • złożoność: ${h(Object.hasOwn(SIZE,c.size)?SIZE[c.size]:c.size)}</td></tr><tr><th>Kryteria</th><td>${h(c.standards.map(id=>FRAMEWORKS.find(z=>z.id===id)?.name||id).join('; ')||'Kryteria umowne / do zatwierdzenia')}</td></tr><tr><th>Obszary</th><td>${h(c.topics.map(id=>TOPICS.find(z=>z.id===id)?.name||id).join('; '))}</td></tr><tr><th>Zakres objęty audytem</th><td>${printableText(c.scope)}</td></tr><tr><th>Zakres wyłączony</th><td>${printableText(c.exclusions,'Nie wyspecyfikowano')}</td></tr><tr><th>Badany okres</th><td>${printableText(c.period)}</td></tr><tr><th>Poprzedni audyt / zmiana</th><td>${printableText(c.previous,'Nie dotyczy / brak informacji')}</td></tr><tr><th>Identyfikatory zadań do ponownego sprawdzenia</th><td>${printableText(c.targets,'Nie dotyczy')}</td></tr><tr><th>Status KSC</th><td>${h(legal)}</td></tr><tr><th>Podstawa kwalifikacji</th><td>${printableText(c.legalEvidence,'Nie udokumentowano')}</td></tr><tr><th>Metoda i próbkowanie</th><td>${printableText(p.method)}</td></tr><tr><th>Ograniczenia</th><td>${printableText(p.limits,'Patrz wyłączenia oraz niezakończone zadania w aneksie')}</td></tr></tbody></table>${scopeNote}${tasksExcludedNote}<p class="pdf-small">Uwaga: wymogi polskich podmiotów w zakresie NIS2 wynikają przede wszystkim z aktualnego KSC, aktów wykonawczych i właściwych regulacji sektorowych. Wpisy w tej macierzy to wskazówki do planu audytu, nie kompletne teksty norm i ustaw.</p></section>`;
    const issues=`<section class="pdf-section"><h2>3. Rejestr ustaleń, ryzyko i plan naprawczy (${state.findings.length})</h2>${state.findings.length?state.findings.map(f=>{const r=riskGrade(f);return `<div class="pdf-finding"><div><b>${h(f.id)} · ${h(f.title)}</b><span>${r.value}/25 • ${r.name}</span></div><p><b>Kryterium:</b> ${printableText(f.criterion)} • <b>Zadanie:</b> ${printableText(f.task)}</p><p><b>Stan faktyczny / próba:</b> ${printableText(f.observation)}</p><p><b>Potencjalny wpływ:</b> ${printableText(f.impactText)}</p><p><b>Dowód:</b> ${printableText(f.evidence)}</p><p><b>Działanie i kryterium zamknięcia:</b> ${printableText(f.action)}</p><p><b>Właściciel:</b> ${printableText(f.owner)} • <b>Termin:</b> ${printableText(f.due)} • <b>Status:</b> ${h(findingLabels[f.status])}</p><p><b>Ponowne sprawdzenie:</b> ${printableText(f.retestEvidence)} • <b>Stanowisko kierownictwa:</b> ${printableText(f.managementResponse)}</p>${fullFindingTrace(f,preview)}</div>`;}).join(''):'<p>Brak zarejestrowanych ustaleń. Brak wpisu nie przesądza o braku niezgodności.</p>'}</section>`;
    const criteria=`<section class="pdf-section"><h2>4. Wyniki kryteriów / wymagań (${rt.length})</h2>${rt.length?`<table class="pdf-table"><thead><tr><th>Kryterium</th><th>Ocena i zastosowanie</th><th>Dowody / uzasadnienie</th></tr></thead><tbody>${rt.map(x=>{const s=reqState(x.id);return `<tr><td><b>${h(x.id)} ${h(x.title)}</b><br><small>${h(x.reference)}</small></td><td>${h(LABEL[s.status]||s.status)}<br><small>${h(({yes:'Dotyczy',no:'Nie dotyczy - wg oceny',pending:'Do ustalenia'})[s.applicability]||s.applicability)}</small></td><td>${printableText(s.evidence,'Bez wskazanego dowodu')}<br><small>${printableText(s.notes,'Bez komentarza')}</small></td></tr>`;}).join('')}</tbody></table>`:'<p>Brak wybranych ram odniesienia. Uzupełnij konfigurację.</p>'}</section>`;
    const gate=`<section class="pdf-section"><h2>5. Ograniczenia i punkty jakości (${checks.length})</h2>${checks.length?`<ul class="pdf-list">${checks.map(x=>`<li><b>${h(x.title)}:</b> ${h(x.detail)}</li>`).join('')}</ul>`:'<p>Nie wykryto braków na poziomie automatycznej kontroli jakości. Przegląd ekspercki pozostaje wymagany.</p>'}<p class="pdf-small">Statusy i listy kontrolne są deklaracjami audytora; nie są dowodami niekwestionowanej zgodności.</p></section>`;
    const workflow=`<section class="pdf-section"><h2>6. Przebieg i pokrycie etapów</h2><table class="pdf-table"><thead><tr><th>Etap</th><th>Liczba</th><th>Wykonane</th><th>Blokady</th><th>N/D</th></tr></thead><tbody>${A.stages.map(s=>{const st=s.tasks.filter(included);if(!st.length)return '';return `<tr><td>${h(s.id+' · '+s.title)}</td><td>${st.length}</td><td>${st.filter(t=>taskState(t.id).status==='done').length}</td><td>${st.filter(t=>taskState(t.id).status==='waiting').length}</td><td>${st.filter(t=>taskState(t.id).status==='na').length}</td></tr>`;}).join('')}</tbody></table></section>`;
    const evidence=`<section class="pdf-section"><h2>7. Indeks dowodów (${state.evidence.length})</h2>${state.evidence.length?`<table class="pdf-table"><thead><tr><th>Dowód / zadanie</th><th>Opis i typ</th><th>Źródło / lokalizacja</th><th>Weryfikacja</th></tr></thead><tbody>${state.evidence.map((x,index)=>`<tr id="full-evidence-${h(index)}"><td>${h(x.id)}<br><small>${h(x.task)}</small></td><td>${h(x.title)}<br><small>${h(x.kind)}; ${h(x.classification)}</small></td><td>${h(x.owner)} • ${h(x.date)}<br><small>${h(x.location)}</small></td><td>${x.verified?'Tak':'Nie'}</td></tr>`).join('')}</tbody></table>`:'<p>Rejestr dowodów nie został uzupełniony. Odwołania w zadaniach mogą być niekompletne.</p>'}</section>`;
    const annex=`<section class="pdf-section pdf-appendix"><h2>8. Aneks: pełne karty zadań (${t.length})</h2><p class="pdf-small">Wykonanie podpunktu oraz ocena wyniku są niezależnymi polami. Każde zadanie zachowuje status, kryterium, wskazany dowód, próbę i komentarz.</p>${A.stages.map(s=>{const tasks=s.tasks.filter(included);if(!tasks.length)return '';return `<h3>${h(s.title)}</h3><p class="pdf-small">Cel: ${h(s.goal)} • kryterium zakończenia: ${h(s.gate)}</p>${tasks.map(x=>{const q=taskState(x.id),steps=G.steps[x.id]||[];return `<div class="pdf-task"><h4>${h(x.id)} · ${h(x.name)}</h4><div class="pdf-task-cols"><div><b>Status:</b> ${h(LABEL[q.status]||q.status)}<br><b>Ocena:</b> ${h(LABEL[q.assessment]||q.assessment)}</div><div><b>Osoba:</b> ${printableText(q.owner)}<br><b>ID dowodów:</b> ${printableText(q.evidence)}</div></div><p><b>Kryteria:</b> ${h(x.refs)} • <b>Oczekiwany dowód:</b> ${h(x.evidence)}</p><p><b>Zakres próby:</b> ${printableText(q.sample)} • <b>Weryfikacja źródła:</b> ${q.verified?'Tak':'Nie'}</p><ol class="pdf-checks">${steps.map((step,i)=>`<li>${q.checks[i]?'[X]':'[ ]'} ${h(step)}</li>`).join('')}</ol><p><b>Obserwacja:</b> ${printableText(q.notes,'Brak komentarza')}<br><b>Wyłączenie / uwagi:</b> ${printableText(q.reason,'Brak')}</p></div>`;}).join('')}`;}).join('')}</section>`;
    const refs=`<section class="pdf-section"><h2>${withAppendix?'9':'8'}. Źródła i podstawa metodyczna</h2><ul class="pdf-list">${A.sources.filter(s=>selectedSources.has(s.id)||c.standards.some(f=>({KSC:['KSC26','NIS2','KSC_TIMES'],ISO:['ISO27001','ISO19011'],CIS:['CIS81'],NIST:['NISTCSF'],GDPR:['GDPR'],DORA:['DORA'],EU2690:['EU2690'],CRA:['CRA'],OWASP:['OWASPASVS']})[f]?.includes?.(s.id))).map(s=>`<li><b>${h(s.title)}</b> (${h(s.org)})<br><small>${h(s.url)}</small></li>`).join('')}</ul><p class="pdf-small">Źródła weryfikowano 04.11.2026. Przed podpisaniem raportu sprawdź zmiany prawa, normy i dokumentację umowną.</p></section>`;
    const sign=`<section class="pdf-section"><h2>Przekazanie i zatwierdzenie</h2><table class="pdf-table"><tbody><tr><th>Audytor wiodący</th><td>${printableText(c.lead)}</td></tr><tr><th>Odbiorca / zatwierdzający</th><td>${printableText(p.approved,'Do zatwierdzenia')}</td></tr><tr><th>Klasyfikacja i dystrybucja</th><td>${printableText(p.classification)}</td></tr><tr><th>Weryfikacja działań naprawczych</th><td>Termin i właściciele zgodnie z rejestrem działań naprawczych / do uzgodnienia</td></tr></tbody></table><p class="pdf-small">Automatyczne wygenerowanie raportu nie stanowi podpisu, poświadczenia zgodności, certyfikatu ani potwierdzenia wykonania audytu ustawowego.</p></section>`;
    const pieces=[summary,overview,methodology,issues,criteria,gate,workflow,evidence];if(withAppendix&&!preview)pieces.push(annex);pieces.push(refs,sign);
    if(preview)return pieces.slice(0,3).join('')+'<div class="pdf-preview-note">Podgląd pokazuje pierwsze trzy sekcje. W PDF i pobranym HTML dostępne są wszystkie wybrane sekcje oraz aneks techniczny.</div>';
    return pieces.join('');
  }
  function currentReport(preview=false){
    return state.mode==='learning'?learningUI.report(preview):reportBody(Boolean(state.report.appendix),preview);
  }
  function renderReport(){
    if(state.mode==='auditor')renderQuality();
    else learningUI.renderModuleSelection();
    v('report-preview').innerHTML=currentReport(true);
  }
  const REPORT_STANDALONE_CSS=`@page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{background:#fff;color:#1a2636;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;margin:0;overflow-wrap:anywhere}h1,h2,h3,h4{color:#0b213a;line-height:1.24}h1{font-size:29px}h2{font-size:18px;border-bottom:2px solid #dbe6ee;padding-bottom:7px;margin-top:21px}h3{font-size:14px;margin-top:16px}h4{font-size:11.5px;margin:0 0 7px}.pdf-cover{min-height:240mm;page-break-after:always;padding-top:19mm}.pdf-brand{letter-spacing:1.4px;font-weight:800;color:#123052}.pdf-brand span{float:right;font-weight:normal;color:#566b80}.pdf-kicker{margin-top:45mm;color:#1f7b87;font-weight:700;letter-spacing:2px}.pdf-sub{font-size:15px;color:#566b80}.pdf-meta-grid{margin-top:24mm;display:grid;grid-template-columns:1fr 1fr;gap:20px}.pdf-meta-grid div{border-top:1px solid #cfd8e2;padding-top:10px}.pdf-meta-grid small{font-size:9px;color:#576d7c;display:block}.pdf-meta-grid b{display:block;font-size:13px}.pdf-cover-note{margin-top:20mm;font-size:10px;color:#677788}.pdf-section{break-before:auto;page-break-inside:auto}.pdf-section>h2{break-after:avoid}.pdf-table{width:100%;border-collapse:collapse;table-layout:fixed;margin:10px 0 15px}.pdf-table th,.pdf-table td{border:1px solid #dce5ed;padding:6px;vertical-align:top;word-wrap:break-word;text-align:left}.pdf-table th{background:#eef3f7;font-size:10px}.pdf-table tr{break-inside:avoid}.pdf-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:18px 0}.pdf-kpis div{padding:12px 8px;border:1px solid #dce5ed}.pdf-kpis b{display:block;font-size:22px;color:#123052}.pdf-kpis small{font-size:9px;color:#53667a}.pdf-warning{border-left:3px solid #b77939;padding:10px;background:#fff6e9}.pdf-small{font-size:10px;color:#586a7f}.pdf-list{padding-left:17px}.pdf-list li{margin-bottom:7px;overflow-wrap:anywhere}.pdf-finding,.pdf-task{border:1px solid #dce5ed;padding:10px 12px;margin:12px 0;break-inside:avoid}.pdf-finding>div:first-child{display:flex;justify-content:space-between;border-bottom:1px solid #dce5ed}.pdf-finding p,.pdf-task p{margin:5px 0}.pdf-task h4{color:#1f5568}.pdf-task-cols{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pdf-checks{padding-left:17px;margin:7px 0}.pdf-checks li{margin:2px 0}.pdf-preview-note{display:none}a{color:#123052}`;
  function htmlStandalone(){const body=currentReport();const title=h(state.config.name||'Raport CyberAudit');return '<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>'+title+'</title><style>'+REPORT_STANDALONE_CSS+learningUI.reportStyles+'</style></head><body>'+body+'</body></html>';}
  function printPdf(){renderReport();v('print-only').innerHTML=currentReport();document.body.classList.add('print-report');window.print();}
  window.addEventListener('afterprint',()=>{document.body.classList.remove('print-report');v('print-only').innerHTML='';});
  function projectJson(project){
    return JSON.stringify({...project,projectName:project.config.name.trim()||'Projekt bez nazwy',
      appVersion:APP_VERSION,changesSinceExport:0,exported:new Date().toISOString()},null,2);
  }
  function exportJson(){
    download(`${filenameBase()}-${dateNow()}.json`,projectJson(state),'application/json;charset=utf-8');
    if(state.changesSinceExport&&!recovery){
      state.changesSinceExport=0;
      dirty=true;
      void flushChanges();
    }
    updateStorageDisplay();
  }
  function exportCsv(){const header=['ID','Etap','Nazwa','W planie','Status','Wynik','Krok 1','Krok 2','Krok 3','Dowód','Osoba','Próba','Notatki','Uzasadnienie N/D'];const rows=ALL.map(x=>{const q=taskState(x.id);return [x.id,x.stageTitle,x.name,included(x)?'Tak':'Nie',LABEL[q.status]||q.status,LABEL[q.assessment]||q.assessment,...q.checks.map(y=>y?'Tak':'Nie'),q.evidence,q.owner,q.sample,q.notes,q.reason];});download(`${filenameBase()}-zadania.csv`,'\uFEFF'+[header,...rows].map(row=>row.map(quoteCsv).join(';')).join('\r\n'),'text/csv;charset=utf-8');}
  function preserveFocus(render,fallback){
    const control=document.activeElement;
    const id=control?.id;
    render();
    if(id&&!control.isConnected)(v(id)||v(fallback))?.focus({preventScroll:true});
  }

  function renderAll(){
    for(const [id,key] of Object.entries(reportFields)){
      const el=v(id);el[el.type==='checkbox'?'checked':'value']=state.report[key];
    }
    applyMode();
    renderWorkspace();
    renderLearner();
    renderPresets();renderSetupControls();renderDashboard();renderPlan();renderCriteria();renderEvidence();renderFindings();renderReport();
  }
  function setupEvents(){
    document.addEventListener('click',ev=>{const p=ev.target.closest('[data-preset]');if(p)chooseProfile(p.dataset.preset);});
    const map={'cfg-name':'name','cfg-org':'org','cfg-lead':'lead','cfg-sponsor':'sponsor','cfg-type':'type','cfg-depth':'depth','cfg-size':'size','cfg-legal':'legal','cfg-legal-evidence':'legalEvidence','cfg-scope':'scope','cfg-exclusions':'exclusions','cfg-period':'period','cfg-previous':'previous','cfg-targets':'targets'};
    const setup=v('view-setup');
    function updateSetup(ev){const el=ev.target,id=el.id,c=state.config;
      if(el.matches('[data-standard]')){const x=el.dataset.standard;c.standards=el.checked?[...new Set([...c.standards,x])]:c.standards.filter(y=>y!==x);}
      else if(el.matches('[data-topic]')){const x=el.dataset.topic;c.topics=el.checked?[...new Set([...c.topics,x])]:c.topics.filter(y=>y!==x);}
      else if(el.matches('[data-tech]')){c.tech[el.dataset.tech]=el.checked;}
      else if(map[id]){c[map[id]]=el.value;}
      else return;
      c.preset='custom';save();renderSetupSummary();renderDashboard();
      if(ev.type==='change'||el.type==='checkbox'||id==='cfg-targets'){
        // Na blur pola tekstowego nie zastępuj przycisków presetów w DOM:
        // inaczej kliknięcie presetu może zostać utracone między mousedown i click.
        if(el.type==='checkbox'||el.tagName==='SELECT')renderPresets();
        renderPlan();renderCriteria();renderReport();
      }
    }
    setup.addEventListener('input',updateSetup);setup.addEventListener('change',updateSetup);
    for(const id of ['task-search','task-filter','show-all-tasks'])v(id).addEventListener(id==='task-search'?'input':'change',renderPlan);
    const stages=v('stage-list');
    stages.addEventListener('click',ev=>{
      const item=ev.target.closest('.work-item');if(!item)return;const id=item.dataset.id,t=TASK_BY_ID[id];
      if(ev.target.closest('.work-toggle')){const opened=!openTasks.has(id);if(opened)openTasks.add(id);else openTasks.delete(id);item.classList.toggle('is-open',opened);$('.work-toggle',item).setAttribute('aria-expanded',String(opened));return;}
      const a=ev.target.closest('[data-action]');if(!a)return;
      if(a.dataset.action==='new-evidence'){v('ev-id').value=nextEvidenceId();v('ev-task').value=id;v('ev-title').value='Dowód dla: '+t.name;location.hash='#evidence';requestAnimationFrame(()=>v('ev-title').focus());}
      else if(a.dataset.action==='new-finding'){v('fi-task').value=id;v('fi-title').value=t.name;v('fi-criterion').value=t.refs;v('fi-evidence').value=taskState(id).evidence;v('fi-observation').value=taskState(id).notes;location.hash='#findings';requestAnimationFrame(()=>v('fi-observation').focus());}
      else if(a.dataset.action==='scope'){
        if(included(t)){const reason=prompt('Dlaczego wyłączasz tę czynność z zakresu? Powód trafi do projektu/raportu.',taskState(id).reason||'');if(reason===null)return;state.config.manual[id]='exclude';const x={...taskState(id)};x.reason=reason;state.tasks[id]=x;}
        else state.config.manual[id]='include';
        save();renderPlan();renderDashboard();renderSetupSummary();renderReport();
      }
    });
    function updateTask(ev){const item=ev.target.closest('.work-item');if(!item)return;const id=item.dataset.id,s={...taskState(id),checks:[...taskState(id).checks]};
      const el=ev.target;
      if(el.matches('.task-step'))s.checks[n(el.dataset.index)]=el.checked;
      else if(el.matches('[data-task-field]')){const field=el.dataset.taskField;s[field]=el.type==='checkbox'?el.checked:el.value;}
      else return;
      state.tasks[id]=s;save();
      if(el.type==='checkbox'||el.tagName==='SELECT'){
        preserveFocus(renderPlan,'task-filter');renderDashboard();if(location.hash==='#report')renderReport();
      }
    }
    stages.addEventListener('input',ev=>{if(ev.target.matches('input:not([type=checkbox]),textarea'))updateTask(ev);});
    stages.addEventListener('change',updateTask);
    for(const id of ['req-search','req-filter','show-all-criteria'])v(id).addEventListener(id==='req-search'?'input':'change',renderCriteria);
    const reqList=v('requirements-list');
    reqList.addEventListener('click',ev=>{
      const scope=ev.target.closest('[data-criterion-scope]');
      if(scope){const id=scope.dataset.criterionScope,criterion=R.find(x=>x.id===id);if(!criterion)return;
        if(criterionIncluded(criterion)){
          const reason=prompt('Uzasadnij wyłączenie wymagania z obecnego zakresu audytu. Powód pojawi się w raporcie.',state.config.criterionManual[id]?.reason||'');
          if(reason===null)return;
          state.config.criterionManual[id]={mode:'exclude',reason:reason.trim()};
        }else state.config.criterionManual[id]={mode:'include',reason:''};
        save();renderCriteria();renderDashboard();renderSetupSummary();renderReport();return;
      }
      const jump=ev.target.closest('[data-jump]');if(!jump)return;const id=jump.dataset.jump;openTasks.add(id);v('task-search').value=id;v('task-filter').value='all';v('show-all-tasks').checked=true;renderPlan();location.hash='#plan';});
    function updateReq(ev){const box=ev.target.closest('.requirement');if(!box)return;const id=box.dataset.req,q={...reqState(id)};const el=ev.target;
      if(!el.matches('[data-req-field]'))return;q[el.dataset.reqField]=el.value;state.requirements[id]=q;save();if(ev.type==='change'&&el.tagName==='SELECT'){preserveFocus(renderCriteria,'req-filter');renderDashboard();}}
    reqList.addEventListener('input',ev=>{if(ev.target.matches('input,textarea'))updateReq(ev);});reqList.addEventListener('change',updateReq);
    v('evidence-form').addEventListener('submit',ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(ev.currentTarget).entries());d.id=String(d.id||'').trim();if(state.evidence.some(x=>x.id.toLowerCase()===d.id.toLowerCase())){alert('Istnieje dowód o takim identyfikatorze. Użyj unikalnego ID.');return;}if(!d.id){alert('Wpisz identyfikator dowodu.');return;}d.date=dateOnly(d.date);d.verified=Boolean(d.verified);state.evidence.push(d);learningUI.linkEvidence(d);save();ev.currentTarget.reset();renderEvidence();renderReport();});
    v('evidence-table').addEventListener('click',ev=>{const b=ev.target.closest('[data-delete-evidence]');if(!b)return;const i=n(b.dataset.deleteEvidence,-1);if(i<0||!state.evidence[i])return;if(confirm('Usunąć metadane dowodu? Odesłania do jego ID pozostaną w zadaniach.')){state.evidence.splice(i,1);save();renderEvidence();renderReport();}});
    v('finding-form').addEventListener('submit',ev=>{ev.preventDefault();const f=Object.fromEntries(new FormData(ev.currentTarget).entries());const id=nextFindingId();state.findings.push({...f,id,due:dateOnly(f.due),likelihood:risk(f.likelihood),impact:risk(f.impact),status:'open',managementResponse:'',retestEvidence:''});save();ev.currentTarget.reset();renderFindings();renderDashboard();renderReport();});
    v('evidence-return-link').addEventListener('click',event=>{
      const [,key,id]=v('evidence-return-link').hash.slice(1).split('/');
      event.preventDefault();
      openQuestion(key,id);
    });
    const fList=v('findings-list');
    fList.addEventListener('click',ev=>{const b=ev.target.closest('[data-delete-finding]');if(!b)return;const i=n(b.dataset.deleteFinding,-1);if(i<0||!state.findings[i])return;if(confirm('Usunąć wskazane ustalenie?')){state.findings.splice(i,1);save();renderFindings();renderDashboard();renderReport();}});
    function updateFinding(ev){const box=ev.target.closest('.finding');if(!box)return;const i=n(box.dataset.finding,-1),el=ev.target;if(!state.findings[i]||!el.matches('[data-finding-field]'))return;const finding=state.findings[i],field=el.dataset.findingField;
      if(field==='status'&&followup.pickStatus(finding,el))return;
      const riskField=field==='likelihood'||field==='impact';
      finding[field]=riskField?risk(el.value):el.type==='date'?dateOnly(el.value):el.value;
      if(riskField){
        const score=riskGrade(finding),badge=$('[data-risk-score]',box);
        badge.className='risk-score '+score.cls;
        badge.textContent=score.value+'/25 · '+score.name;
      }
      save();
      if(ev.type==='change'){
        if(field==='status')preserveFocus(renderFindings);
        else if(field==='owner'||field==='due'||field==='action')followup.renderBoard();
        renderDashboard();renderReport();
      }
    }
    fList.addEventListener('input',ev=>{if(ev.target.matches('input,textarea'))updateFinding(ev);});fList.addEventListener('change',updateFinding);
    for(const [id,key] of Object.entries(reportFields)){const el=v(id);el[el.type==='checkbox'?'checked':'value']=state.report[key];const change=()=>{state.report[key]=el.type==='checkbox'?el.checked:el.value;save();if(el.type==='checkbox'||el.tagName==='SELECT')renderReport();};el.addEventListener('input',change);el.addEventListener('change',()=>{change();renderReport();});}
    v('top-export').addEventListener('click',exportJson);v('top-pdf').addEventListener('click',printPdf);v('generate-pdf').addEventListener('click',printPdf);
    v('export-json').addEventListener('click',exportJson);v('export-csv').addEventListener('click',exportCsv);
    v('download-html-report').addEventListener('click',()=>download(`${filenameBase()}-raport.html`,htmlStandalone(),'text/html;charset=utf-8'));
    setupWorkspaceEvents();
    setupLearningEvents();
    followup.bind();
    v('docs-grid').addEventListener('click',ev=>{const b=ev.target.closest('[data-pdf]');if(!b)return;v('pdf-dialog-title').textContent=b.dataset.title;v('pdf-dialog-frame').src=b.dataset.pdf;v('pdf-dialog').showModal();});
    v('close-pdf').addEventListener('click',()=>v('pdf-dialog').close());
    v('pdf-dialog').addEventListener('close',()=>v('pdf-dialog-frame').removeAttribute('src'));
    v('pdf-dialog').addEventListener('click',ev=>{if(ev.target.id==='pdf-dialog')v('pdf-dialog').close();});
    v('file-storage-warning').hidden=location.protocol!=='file:';
    v('skip-content').addEventListener('click',event=>{
      event.preventDefault();
      v('content').focus();
      v('content').scrollIntoView();
    });
    v('main-nav').addEventListener('click',event=>{
      if(event.target.closest('a[aria-current="page"]')&&v('sidebar').classList.contains('visible')){
        event.preventDefault();
        route(true);
      }
    });
    v('menu-toggle').addEventListener('click',()=>{
      const open=!v('sidebar').classList.contains('visible');
      setMenu(open);
      if(open)$('#main-nav [aria-current="page"]')?.focus();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&v('sidebar').classList.contains('visible')){
        setMenu(false);
        v('menu-toggle').focus();
      }
    });
  }
  function setMenu(open){
    v('sidebar').classList.toggle('visible',open);
    v('menu-toggle').setAttribute('aria-expanded',String(open));
  }
  function route(moveFocus=false){
    const [page,locationAnchor,questionId]=(location.hash.slice(1)||'home').split('/');
    const titles={home:'Pulpit',projects:'Projekty',audit:'Audyt',glossary:'Słowniczek',setup:'Konfigurator audytu',plan:'Plan i listy kontrolne',criteria:'Macierz wymagań',evidence:'Rejestr dowodów',findings:'Ustalenia i plan naprawczy',report:'Raport i PDF',library:'Formularze i wzory',help:'Jak audytować?',sources:'Źródła'};
    let name=Object.hasOwn(titles,page)?page:'home';
    if(state.mode!=='auditor'&&['setup','plan','criteria','library','sources'].includes(name))name=hasProject()?'audit':'home';
    if(state.mode==='auditor'&&name==='audit')name='plan';
    if(!hasProject()&&['audit','evidence','findings','report'].includes(name))name='projects';
    $$('.view').forEach(view=>view.classList.toggle('active',view.id==='view-'+name));
    $$('#main-nav a').forEach(link=>{
      const active=link.dataset.view===name;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    v('breadcrumb-text').textContent=titles[name];
    setMenu(false);
    if(name==='report')renderReport();
    if(name==='findings')renderFindings();
    if(name==='audit'){
      if(questionId&&Object.hasOwn(state.learning.programs,locationAnchor)&&state.learning.selected!==locationAnchor&&
        state.learning.programs[locationAnchor].template.questions.some(item=>item.id===questionId)){
        state.learning.selected=locationAnchor;
        save();
      }
      renderLearner();
    }
    if(moveFocus){
      const heading=$('#view-'+name+' h1');
      heading.tabIndex=-1;
      heading.focus({preventScroll:true});
    }
    if(name==='audit'&&questionId&&learningUI.jumpToQuestion(questionId))return;
    if(name==='glossary'&&locationAnchor&&v('term-'+locationAnchor)){
      const term=v('term-'+locationAnchor);
      term.focus({preventScroll:true});
      term.scrollIntoView({block:'center'});
    }else if(name==='audit'&&locationAnchor==='zgoda'){
      v('learning-consent').focus({preventScroll:true});
      v('learning-scope').scrollIntoView({block:'center'});
    }else if(name==='audit'&&locationAnchor==='pytania'){
      v('audit-program').focus({preventScroll:true});
      v('audit-programs').scrollIntoView({block:'center'});
    }else window.scrollTo({top:0,behavior:'instant'});
  }
  async function init(){
    v('app-version').textContent='Wersja '+APP_VERSION;
    await load();
    renderLibrary();renderHelp();renderSources();renderAll();setupEvents();updateStorageDisplay();
    window.addEventListener('hashchange',()=>route(true));
    window.addEventListener('storage',event=>{
      if(event.key===KEY || event.key===null){
        lastSaved='Lista projektów zmieniła się w innej karcie. Zapisz kopię bieżącej pracy i odśwież.';
        updateStorageDisplay();
      }
    });
    window.addEventListener('beforeunload',event=>{
      if(!dirty)return;
      event.preventDefault();
      event.returnValue=true;
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)void flushChanges();});
    route();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
