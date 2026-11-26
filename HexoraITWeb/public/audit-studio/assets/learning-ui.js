(() => {
  'use strict';
  const { templates, advanced, upcoming } = window.AUDIT_TEMPLATES;
  const { materials, answers: demoAnswers } = window.AUDIT_DEMO;
  const { indicators, results, findingFromQuestion, riskLevel, scoreStatus, evidenceReferences, questionSource, reportPrograms, latestClosingDecision } = window.AUDIT_PROJECT_DATA;
  const steps = [
    ['Zakres i zgoda','Zapisz, co obejmujesz i kto zgodził się na przegląd.','#audit/zgoda'],
    ['Informacje','Ustal, kto odpowiada za sprzęt, konta, pocztę i kopie. Poproś o istniejące dokumenty.','#audit'],
    ['Lista kontrolna','Oceń tylko to, co wynika z informacji i dowodów.','#audit/pytania'],
    ['Dowody','Zapisz identyfikatory, daty i źródła.','#evidence'],
    ['Ustalenia','Opisz zaobserwowane braki, ich wpływ i zalecenia.','#findings'],
    ['Raport','Opisz zakres, ograniczenia i najważniejsze wyniki prostym językiem.','#report'],
    ['Plan naprawczy','Przypisz działanie, właściciela i termin. Po poprawce zapisz jej sprawdzenie.','#findings']
  ];
  const terms = [
    ['MFA','Logowanie wymagające dodatkowego potwierdzenia tożsamości, np. w aplikacji.'],
    ['EDR','Narzędzie, które obserwuje zdarzenia na komputerach i pomaga zespołowi reagować.'],
    ['RoE','Uzgodnione zasady prac. Opisują, czego dotyczy audyt, kto go zatwierdził i kiedy należy przerwać pracę.'],
    ['CAPA','Plan działań naprawczych i zapobiegawczych. Wskazuje, co poprawić, kto odpowiada i do kiedy.'],
    ['SPF','Informacja o tym, które usługi są upoważnione do wysyłania poczty dla domeny.'],
    ['DKIM','Podpis dołączany do wiadomości, który pomaga odbiorcy sprawdzić pochodzenie wiadomości.'],
    ['DMARC','Zasada postępowania z pocztą niespełniającą warunków uwierzytelnienia domeny i sposób raportowania.'],
    ['VPN','Chronione połączenie urządzenia pracownika z zasobami firmy lub z określoną siecią.'],
    ['Segmentacja','Podział sieci na strefy z ustalonymi zasadami komunikacji między nimi.'],
    ['Próbkowanie','Sprawdzanie wybranej części kont, urządzeń lub dokumentów i opisanie granic wnioskowania.'],
    ['Dowód','Materiał, na którym opiera się ocena. W Studio zapisujesz jego identyfikator, źródło i datę.'],
    ['Ustalenie','Opis stanu stwierdzonego podczas audytu, poparty dowodem i powiązany z oczekiwaniem.'],
    ['Ryzyko rezydualne','Ryzyko, które pozostaje po zastosowaniu zabezpieczeń i wprowadzeniu poprawek.'],
    ['Odtworzenie','Przywrócenie danych z kopii. Protokół z próby wskazuje, co i kiedy udało się odzyskać.'],
    ['Retencja','Okres przechowywania danych i zasady ich usunięcia po upływie tego okresu.'],
    ['Kryterium','Uzgodnione oczekiwanie lub właściwe wymaganie, z którym porównujesz zaobserwowany stan.'],
    ['Zasada najmniejszych uprawnień','Przydzielenie zakresu dostępu potrzebnego do konkretnego zadania.']
  ];
  const scoreMethod='Wskaźnik orientacyjny. Zgodne = 1, Częściowo = 0,5, Niezgodne = 0. „Nie dotyczy” jest poza mianownikiem. „Nie oceniono” pozostaje w mianowniku bez punktów. Wskaźnik nie jest podstawą certyfikacji.';
  const answerDefaults=()=>({status:'unassessed',note:'',evidence:''});
  const visibleScore=metric=>metric.percent===null?'Brak ocen':metric.percent+'%';
  const relatedTerms=[['MFA','mfa'],['EDR','edr'],['VPN','vpn'],['SPF','spf'],['DKIM','dkim'],['DMARC','dmarc']];
  const coverage=metric=>`${metric.assessed} z ${metric.eligible} ocenionych · ${metric.unassessed} bez oceny · ${metric.excluded} nie dotyczy`;
  const programKey=template=>template.id+'-'+template.version;
  const labelRisk=value=>riskLevel(value.likelihood*value.impact);
  const reportStyles='.short-page{overflow-wrap:anywhere}.short-page h2,.short-page h3{break-after:avoid}.short-page table{margin:.5em 0 1em}.short-chart{display:block;width:100%;height:auto;max-height:135mm}.short-page .pdf-table tr,.report-module,.report-trace{break-inside:avoid}.short-page a{color:#125570;text-decoration:underline}@media print{.short-page+.short-page{break-before:page}.short-page tr,.short-page li{break-inside:avoid}}';

  function createLearningUI({ h, getState, hasProject, save, go, chooseTemplate, chooseProfile, nextEvidenceId, nextFindingId, refreshRecords }) {
    const v=id=>document.getElementById(id);
    const activeProgram=()=>getState().learning.programs[getState().learning.selected]??null;
    let filterContext='', pendingEvidence=null, pickedQuestion=null;
    const statePrograms=()=>getState().learning.programs;
    const knownEvidence=()=>[...getState().evidence.map(item=>item.id),...(getState().demo?materials.map(([id])=>id):[])];
    const matchesFinding=(finding,id,key)=>finding.questionId===id && questionSource(finding,statePrograms())?.key===key;

    function answerIssues(answer, known) {
      if(!answer)return [];
      const issues=[];
      const refs=evidenceReferences(answer.evidence,known);
      if(answer.status==='notapp'){
        if(!answer.note.trim())issues.push('Podaj powód wyłączenia. Do tego czasu pytanie liczy się jako nieocenione.');
      }else if(answer.status!=='unassessed'){
        if(!answer.note.trim())issues.push('Dopisz, co sprawdzono i dlaczego wybrano tę ocenę.');
        if(!refs.length)issues.push('Powiąż dowód lub opisz jego brak w uzasadnieniu.');
      }
      const missing=refs.filter(ref=>!ref.known).map(ref=>ref.id);
      if(missing.length)issues.push('Brak w rejestrze: '+missing.join(', ')+'.');
      return issues;
    }

    function questionWarning(issues) {
      return issues.length?`<ul class="question-warning">${issues.map(issue=>`<li>${h(issue)}</li>`).join('')}</ul>`:'';
    }

    function jumpToQuestion(id) {
      const program=activeProgram();
      if(!program?.template.questions.some(question=>question.id===id))return false;
      if(!v('answer-'+id)){
        v('question-area').value='';
        v('question-filter').value='';
        renderQuestions(program);
      }
      focusOnScreen('answer-'+id);
      return true;
    }

    function metrics(program) {
      const status=question=>scoreStatus(program.answers[question.id]);
      return {
        total:indicators(program.template.questions.map(status)),
        areas:program.template.areas.map(area=>({
          name:area.name, ...indicators(program.template.questions.filter(question=>question.area===area.id).map(status))
        }))
      };
    }

    function renderGuide(){
      const index=getState().learning.step;
      const [name,detail,href]=steps[index];
      v('guide-intro').textContent=name+' — '+detail;
      v('guide-steps').innerHTML=steps.map(([title],i)=>`<li${i===index?' aria-current="step"':''}>${h(title)}</li>`).join('');
      v('guide-prev').disabled=!hasProject()||index===0;
      v('guide-next').disabled=!hasProject()||index===steps.length-1;
      v('guide-link').href=hasProject()?href:'#projects';
      v('guide-link').textContent=hasProject()?'Przejdź do tego kroku':'Otwórz projekty';
    }

    function renderCatalog(){
      v('learning-cards').innerHTML=templates.map(template=>`<article class="panel template-card">
        <small>Poziom ${h(template.level)} · ${h(template.duration)} · ${h(template.questions.length)} pytań</small>
        <h3>${h(template.name)}</h3><p>${h(template.description)}</p>
        <p><b>Dla kogo:</b> ${h(template.audience)}</p><p><b>Czego się nauczysz:</b> ${h(template.learning)}</p>
        <button class="btn btn-accent btn-sm" type="button" data-template="${h(template.id)}">Otwórz szablon</button>
      </article>`).join('');
      v('advanced-cards').innerHTML=[...advanced,...upcoming].map(card=>`<article class="panel template-card">
        <small>Poziom ${h(card.level)}${card.preset?'':' · Wkrótce'}</small><h3>${h(card.name)}</h3><p>${h(card.description)}</p>
        ${card.preset?`<p><b>Przed rozpoczęciem:</b> ${h(card.prerequisites)}</p><button class="btn btn-accent btn-sm" type="button" data-profile="${h(card.preset)}">Otwórz profil</button>`:''}
      </article>`).join('');
      v('glossary-terms').innerHTML=terms.map(([term,meaning])=>{
        const id=relatedTerms.find(([name])=>name===term)?.[1]??(term==='RoE'?'roe':'');
        return `<dt${id?` id="term-${h(id)}" tabindex="-1"`:''}>${h(term)}</dt><dd>${h(meaning)}</dd>`;
      }).join('');
    }

    function renderDemo(program) {
      const visible=getState().demo&&program?.template.id==='BAZ'&&program.template.version===1;
      v('demo-materials').hidden=!visible;
      if(!visible){
        v('answer-key').hidden=true;
        return;
      }
      const key=v('answer-key');
      v('toggle-key').setAttribute('aria-expanded',String(!key.hidden));
      v('toggle-key').textContent=key.hidden?'Pokaż klucz odpowiedzi':'Ukryj klucz odpowiedzi';
      if(key.hidden)key.replaceChildren();
      else{
        const questions=new Map(program.template.questions.map(question=>[question.id,question.question]));
        key.innerHTML=`<h3>Porównanie z oceną przykładową</h3><p>Brak informacji uzasadnia „Nie oceniono”. Porównaj ocenę i uzasadnij różnice.</p>
          <div class="table-wrap"><table><thead><tr><th>Pytanie</th><th>Twoja ocena</th><th>Ocena przykładowa</th><th>Materiał</th></tr></thead><tbody>
          ${demoAnswers.map(answer=>`<tr><td>${h(answer.id)} · ${h(questions.get(answer.id))}</td><td>${h(results[program.answers[answer.id]?.status??'unassessed'])}</td><td>${h(results[answer.status])}</td><td>${h(answer.evidence)}</td></tr>`).join('')}
          </tbody></table></div>`;
      }
    }

    function renderSummary(program) {
      const summary=v('learning-summary');
      summary.hidden=!program;
      if(!program){summary.replaceChildren();return;}
      const data=metrics(program);
      const known=knownEvidence();
      const incomplete=program.template.questions.filter(question=>answerIssues(program.answers[question.id],known).length).length;
      summary.innerHTML=`<h2>${h(program.template.name)}</h2><p><b>Wynik orientacyjny: ${h(visibleScore(data.total))}</b> · ${h(coverage(data.total))}</p>
        <p class="muted">${h(scoreMethod)}</p>
        ${incomplete?`<p><button class="pill-action" type="button" data-show-incomplete>Oceny do uzupełnienia (${h(incomplete)})</button></p>`:''}
        <div class="area-scores">${data.areas.map(area=>`<div><b>${h(area.name)}</b><span>${h(visibleScore(area))} · ${h(coverage(area))}</span></div>`).join('')}</div>`;
    }

    function renderEvidenceChoices() {
      const ids=knownEvidence();
      v('question-evidence-list').innerHTML=ids.map(id=>`<option value="${h(id)}"></option>`).join('');
    }

    function renderQuestions(program) {
      const target=v('questions');
      if(!program){target.replaceChildren();return;}
      const area=v('question-area').value, filter=v('question-filter').value;
      const known=knownEvidence(), key=getState().learning.selected;
      const shown=program.template.questions.filter(question=>{
        const answer=program.answers[question.id], status=answer?.status??'unassessed';
        return (!area||question.area===area)&&(!filter||(filter==='incomplete'?answerIssues(answer,known).length:filter==='unassessed'?scoreStatus(answer)==='unassessed':status===filter));
      });
      target.innerHTML=shown.length?shown.map(question=>{
        const answer=program.answers[question.id]??answerDefaults();
        const id=h(question.id);
        const existing=getState().findings.find(item=>matchesFinding(item,question.id,key));
        const glossary=relatedTerms.filter(([name])=>question.question.includes(name));
        return `<article class="panel question-card" data-question="${id}">
          <div class="question-heading"><div><small>${id}</small><h3>${h(question.question)}</h3></div><span class="status-tag" data-question-status>${h(results[answer.status])}</span></div>
          ${glossary.length?`<p class="storage-note">W słowniczku: ${glossary.map(([label,key])=>`<a href="#glossary/${h(key)}">${h(label)}</a>`).join(' · ')}</p>`:''}
          <details><summary>Jak ocenić to pytanie?</summary>
            <dl class="question-explainer"><dt>Dlaczego to ważne</dt><dd>${h(question.why)}</dd><dt>Jak to sprawdzić</dt><dd>${h(question.how)}</dd><dt>Przykładowy dowód</dt><dd>${h(question.evidence)}</dd>
              <dt>Domyślne ryzyko</dt><dd>${h(question.risk)}. ${h(question.riskReason)}</dd><dt>Podpowiedź zalecenia</dt><dd>${h(question.recommendation)}</dd><dt>Odniesienie</dt><dd>${h(question.reference)}</dd></dl>
          </details>
          <div class="form-grid space-top">
            <label class="field">Ocena<select id="answer-${id}" data-answer-field="status">
              ${Object.entries(results).map(([key,label])=>`<option value="${h(key)}"${key===answer.status?' selected':''}>${h(label)}</option>`).join('')}
            </select></label>
            <label class="field">Identyfikatory dowodów<input data-answer-field="evidence" list="question-evidence-list" value="${h(answer.evidence)}" placeholder="Np. E-003"></label>
          </div>
          <label class="field">Uzasadnienie oceny <textarea id="note-${id}" rows="2" data-answer-field="note" placeholder="Np. sprawdzono 5 kont, na 2 brakowało MFA.">${h(answer.note)}</textarea></label>
          <div data-answer-issues>${questionWarning(answerIssues(answer,known))}</div>
          <div class="button-row question-actions"><button type="button" class="btn btn-light btn-sm" data-question-action="pick">Wybierz z rejestru</button>
            <button type="button" class="btn btn-light btn-sm" data-question-action="evidence">Dodaj dowód</button>
            <button type="button" class="btn btn-accent btn-sm" data-question-action="finding"${!existing&&!['partial','nonconform'].includes(answer.status)?' hidden':''}>${existing?'Otwórz ustalenie':'Utwórz ustalenie'}</button>
          </div>
        </article>`;
      }).join(''):'<p class="empty-state">Brak pytań w wybranym obszarze lub z tą oceną.</p>';
    }

    function render() {
      renderGuide();
      const state=getState(), program=activeProgram();
      const hasProgram=Boolean(program);
      v('learning-scope-text').textContent=state.config.scope||'Zakres nie został jeszcze opisany.';
      v('learning-consent').value=state.learning.consent;
      const selectedKeys=Object.entries(state.learning.programs);
      v('audit-programs').innerHTML=`<label class="field">Szablon projektu<select id="audit-program">
        <option value="">Wybierz szablon</option>
        ${selectedKeys.map(([key,item])=>`<option value="${h(key)}"${key===state.learning.selected?' selected':''}>${h(item.template.name)} (wersja ${h(item.template.version)})</option>`).join('')}
        ${templates.filter(template=>!Object.hasOwn(state.learning.programs,programKey(template)))
          .map(template=>`<option value="new:${h(template.id)}">${h(template.name)}</option>`).join('')}
      </select></label>`;
      const context=state.id+'/'+state.learning.selected;
      const area=v('question-area'), filter=v('question-filter');
      const areaValue=filterContext===context?area.value:'', filterValue=filterContext===context?filter.value:'';
      filterContext=context;
      area.innerHTML='<option value="">Wszystkie obszary</option>'+(program?.template.areas.map(item=>`<option value="${h(item.id)}">${h(item.name)}</option>`).join('')??'');
      filter.innerHTML='<option value="">Wszystkie oceny</option><option value="incomplete">Do uzupełnienia</option>'+Object.entries(results).map(([key,label])=>`<option value="${h(key)}">${h(label)}</option>`).join('');
      area.value=areaValue;
      filter.value=filterValue;
      v('question-toolbar').hidden=!hasProgram;
      v('question-message').textContent='';
      renderEvidenceChoices();
      renderDemo(program);
      renderSummary(program);
      renderQuestions(program);
    }

    function answerChanged(event) {
      const field=event.target.dataset.answerField;
      const card=event.target.closest('[data-question]');
      const program=activeProgram();
      if(!program||!card||!field||!['status','note','evidence'].includes(field))return;
      const id=card.dataset.question;
      if(!program.template.questions.some(question=>question.id===id))return;
      const current=program.answers[id]??answerDefaults();
      const answer={...current,[field]:event.target.value};
      if(answer[field]===current[field]&&answer.note===current.note&&answer.status===current.status)return;
      program.answers[id]=answer;
      save();
      card.querySelector('[data-question-status]').textContent=results[answer.status];
      const existing=getState().findings.some(item=>matchesFinding(item,id,getState().learning.selected));
      card.querySelector('[data-question-action="finding"]').hidden=!existing&&!['partial','nonconform'].includes(answer.status);
      card.querySelector('[data-answer-issues]').innerHTML=questionWarning(answerIssues(answer,knownEvidence()));
      renderSummary(program);
      if(answer.status!==current.status)renderDemo(program);
      if(field==='status'&&v('question-filter').value){
        renderQuestions(program);
        (v('answer-'+id)??v('question-filter')).focus({preventScroll:true});
      }
    }

    function focusOnScreen(id) {
      requestAnimationFrame(()=>{
        const field=v(id);
        if(!field)return;
        field.focus({preventScroll:true});
        field.scrollIntoView({block:'center'});
      });
    }

    function attachEvidence(program, questionId, id) {
      const answer=program.answers[questionId]??answerDefaults();
      program.answers[questionId]={...answer,evidence:evidenceReferences([answer.evidence,id].filter(Boolean).join(', '),knownEvidence())
        .map(ref=>ref.id).join(', ')};
    }

    function linkEvidence(entry) {
      const state=getState(), pending=pendingEvidence;
      pendingEvidence=null;
      if(!pending || pending.projectId!==state.id || entry.task!==pending.id)return;
      const program=state.learning.programs[pending.key];
      if(!program)return;
      attachEvidence(program,pending.id,entry.id);
      v('evidence-return-link').href='#audit/'+pending.key+'/'+pending.id;
      v('evidence-return').hidden=false;
    }

    function openEvidencePicker(question, program) {
      const state=getState();
      pickedQuestion={projectId:state.id,key:state.learning.selected,id:question.id};
      const choices=v('evidence-picker-options');
      const attached=new Set(evidenceReferences(program.answers[question.id]?.evidence,knownEvidence()).map(ref=>ref.id.toLowerCase()));
      const entries=[...state.evidence.map(item=>[item.id,item.title]),...(state.demo?materials:[])].filter(([id])=>!attached.has(id.toLowerCase()));
      choices.innerHTML='<option value="">Wybierz dowód</option>'+entries.map(([id,title])=>`<option value="${h(id)}">${h(id)} · ${h(title)}</option>`).join('');
      v('evidence-picker-message').textContent=entries.length?'':'Brak kolejnych pozycji. Wróć do pytania i użyj „Dodaj dowód”.';
      v('evidence-picker-dialog').showModal();
      choices.focus();
    }

    function renderModuleSelection() {
      const {learning}=getState();
      const automatic=learning.reportPrograms===null;
      const selected=reportPrograms(learning);
      v('report-follow-active').checked=automatic;
      v('report-module-options').innerHTML=Object.entries(learning.programs).map(([key,program])=>
        `<label class="inline-check"><input type="checkbox" data-report-program="${h(key)}"${selected.includes(key)?' checked':''}${automatic?' disabled':''}>
          ${h(program.template.name)} · wersja ${h(program.template.version)} · ${h(coverage(metrics(program).total))}</label>`).join('');
    }

    function bind() {
      renderCatalog();
      v('demo-documents').innerHTML=materials.map(([id,title,content])=>`<details class="demo-document"><summary>${h(id)} · ${h(title)}</summary><p>${h(content)}</p></details>`).join('');
      document.addEventListener('click',event=>{
        const template=event.target.closest('[data-template]');
        const profile=event.target.closest('[data-profile]');
        if(template){const item=templates.find(entry=>entry.id===template.dataset.template);if(item)chooseTemplate(item);}
        if(profile)chooseProfile(profile.dataset.profile);
      });
      for(const [id,delta] of [['guide-next',1],['guide-prev',-1]])v(id).addEventListener('click',()=>{
        const state=getState();
        state.learning.step=Math.min(steps.length-1,Math.max(0,state.learning.step+delta));
        save();renderGuide();
      });
      v('learning-consent').addEventListener('input',event=>{
        getState().learning.consent=event.target.value;
        save();
      });
      v('evidence-picker-cancel').addEventListener('click',()=>v('evidence-picker-dialog').close());
      v('evidence-picker-dialog').addEventListener('close',()=>{pickedQuestion=null;});
      v('evidence-picker-form').addEventListener('submit',event=>{
        event.preventDefault();
        const state=getState(), pick=pickedQuestion;
        const id=v('evidence-picker-options').value;
        const program=pick && state.id===pick.projectId && state.learning.programs[pick.key];
        if(!program || !knownEvidence().includes(id))return;
        attachEvidence(program,pick.id,id);
        save();
        v('evidence-picker-dialog').close();
        const field=v('note-'+pick.id)?.closest('[data-question]')?.querySelector('[data-answer-field="evidence"]');
        if(field){
          field.value=program.answers[pick.id].evidence;
          field.closest('[data-question]').querySelector('[data-answer-issues]').innerHTML=questionWarning(answerIssues(program.answers[pick.id],knownEvidence()));
          field.focus();
        }
        renderSummary(program);
      });
      v('learning-summary').addEventListener('click',event=>{
        if(!event.target.closest('[data-show-incomplete]'))return;
        v('question-area').value='';
        v('question-filter').value='incomplete';
        renderQuestions(activeProgram());
        v('question-filter').focus();
      });
      v('report-modules').addEventListener('change',event=>{
        const {learning}=getState();
        if(event.target.id==='report-follow-active')learning.reportPrograms=event.target.checked?null:reportPrograms(learning);
        else if(event.target.matches('[data-report-program]'))learning.reportPrograms=
          [...v('report-module-options').querySelectorAll('input:checked')].map(input=>input.dataset.reportProgram);
        else return;
        save();
        v('report-preview').innerHTML=report(true);
        if(event.target.id==='report-follow-active')renderModuleSelection();
      });
      v('report-preview').addEventListener('click',event=>{
        const link=event.target.closest('a[href^="#preview-"]');
        const target=link&&v(link.hash.slice(1));
        if(!target)return;
        event.preventDefault();
        target.tabIndex=-1;
        target.focus({preventScroll:true});
        target.scrollIntoView({block:'nearest'});
      });
      v('toggle-key').addEventListener('click',()=>{const key=v('answer-key');key.hidden=!key.hidden;renderDemo(activeProgram());});
      v('audit-programs').addEventListener('change',event=>{
        const key=event.target.value, state=getState();
        if(key.startsWith('new:')){
          const item=templates.find(template=>template.id===key.slice(4));
          if(item)chooseTemplate(item);
        }else if(key===''||Object.hasOwn(state.learning.programs,key)){
          state.learning.selected=key||null;
          save();render();v('audit-program').focus();
        }
      });
      for(const id of ['question-area','question-filter'])v(id).addEventListener('change',()=>renderQuestions(activeProgram()));
      v('questions').addEventListener('input',event=>{if(event.target.tagName!=='SELECT')answerChanged(event);});
      v('questions').addEventListener('change',event=>{if(event.target.tagName==='SELECT')answerChanged(event);});
      v('questions').addEventListener('click',event=>{
        const button=event.target.closest('[data-question-action]');
        if(!button)return;
        const program=activeProgram();
        const question=program?.template.questions.find(item=>item.id===button.closest('[data-question]').dataset.question);
        if(!question)return;
        if(button.dataset.questionAction==='pick'){openEvidencePicker(question,program);return;}
        const state=getState(), key=state.learning.selected;
        if(button.dataset.questionAction==='evidence'){
          pendingEvidence={projectId:state.id,key,id:question.id};
          v('evidence-return').hidden=true;
          v('ev-id').value=nextEvidenceId();
          v('ev-task').value=question.id;
          v('ev-title').value='Dowód dla '+question.id;
          go('evidence');focusOnScreen('ev-title');
          return;
        }
        let index=state.findings.findIndex(item=>matchesFinding(item,question.id,key));
        if(index===-1){
          const finding=findingFromQuestion(question,program.answers[question.id],nextFindingId(),key);
          if(!finding)return;
          index=state.findings.push(finding)-1;
          save();refreshRecords();
        }
        go('findings');focusOnScreen('finding-'+index+'-observation');
      });
    }

    function chart(areas) {
      const count=areas.length;
      const height=Math.max(1,count)*23+12;
      return `<svg class="short-chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 ${h(height)}" role="img" aria-label="Wynik orientacyjny według obszarów" font-family="Arial, sans-serif" font-size="12">
        <title>Wynik orientacyjny według obszarów</title>
        ${areas.map((area,index)=>{
          const row=index*23+5;
          const width=(area.percent??0)*2;
          return `<g><title>${h(area.name)} · ${h(coverage(area))}</title>
            <text x="1" y="${h(row+11)}" fill="#16334b">${h(area.name.length>37?area.name.slice(0,36)+'…':area.name)}</text>
            <rect x="255" y="${h(row)}" width="200" height="11" fill="#e2eaf1"/><rect x="255" y="${h(row)}" width="${h(width)}" height="11" fill="#17627c"/>
            <text x="465" y="${h(row+11)}" fill="#16334b">${h(visibleScore(area))} · ${h(area.assessed)}/${h(area.eligible)} ocen</text></g>`;
        }).join('')}
      </svg>`;
    }

    function report(preview=false) {
      const state=getState(), programs=state.learning.programs;
      const keys=reportPrograms(state.learning), selected=new Set(keys), known=knownEvidence();
      const {decisionLabel,labels}=window.AUDIT_FOLLOWUP;
      const prefix=preview?'preview-':'report-';
      const text=(value,fallback='Nie podano')=>h(value?.trim()||fallback).replace(/\n/g,'<br>');
      const allFindings=state.findings.map(item=>({item,source:questionSource(item,programs)}));
      const findings=allFindings.filter(({source})=>!source||selected.has(source.key))
        .sort((a,b)=>b.item.likelihood*b.item.impact-a.item.likelihood*a.item.impact)
        .map((row,index)=>({...row, anchor:prefix+'question-'+(index+1)}));
      const priorities=findings.filter(({item})=>!['closed','accepted'].includes(item.status)&&item.action.trim()).slice(0,5);
      const selectedEvidence=new Set();
      const collect=value=>evidenceReferences(value,known).filter(ref=>ref.known).forEach(ref=>selectedEvidence.add(ref.id.toLowerCase()));
      for(const key of keys)for(const answer of Object.values(programs[key].answers))collect(answer.evidence);
      for(const {item,source} of findings){
        collect(item.evidence);
        collect((item.assessment??source?.program.answers[item.questionId])?.evidence);
        for(const decision of item.decisions??[])collect(decision.evidence);
      }
      const evidence=state.evidence.filter(item=>selectedEvidence.has(item.id.toLowerCase()));
      if(state.demo){
        for(const [id,title] of materials){
          if(!selectedEvidence.has(id.toLowerCase())||evidence.some(item=>item.id.toLowerCase()===id.toLowerCase()))continue;
          evidence.push({id,title,location:'Materiał ćwiczeniowy',date:''});
        }
      }
      const evidenceAnchors=new Map(evidence.map((entry,index)=>[entry.id.toLowerCase(),prefix+'evidence-'+(index+1)]));
      const proof=value=>evidenceReferences(value,known).map(ref=>{
        const anchor=evidenceAnchors.get(ref.id.toLowerCase());
        return anchor?`<a href="#${h(anchor)}">${h(ref.id)}</a>`:`${h(ref.id)} (brak w rejestrze)`;
      }).join(', ')||'Nie podano';

      const moduleSummary=keys.map(key=>{
        const program=programs[key], data=metrics(program);
        const incomplete=program.template.questions.filter(question=>answerIssues(program.answers[question.id],known).length).length;
        return `<article class="report-module" data-report-module="${h(key)}">
          <h3>${h(program.template.name)} · wersja ${h(program.template.version)}</h3>
          <p><b>${h(visibleScore(data.total))}</b> · ${h(coverage(data.total))}${incomplete?' · '+h(incomplete)+' ocen do uzupełnienia':''}</p>
          ${chart(data.areas)}
        </article>`;
      }).join('');
      const heading=`<section class="pdf-section short-page">
        <p class="pdf-small">CyberAudit Studio · Raport z przeglądu wewnętrznego${state.demo?' · FIKCYJNE ĆWICZENIE':''}</p>
        <h1>${text(state.config.name,'Raport audytu')}</h1>
        <p><b>Firma:</b> ${text(state.config.org)} · <b>Audytor:</b> ${text(state.config.lead)} · <b>Data:</b> ${text(state.auditDate)}</p>
        <h2>1. Podsumowanie dla kierownictwa</h2><p>${text(state.report.summary,'Nie dodano podsumowania.')}</p>
        <p><b>Zakres:</b> ${text(state.config.scope)}</p><p><b>Zgoda:</b> ${text(state.learning.consent)}</p><p><b>Ograniczenia:</b> ${text(state.report.limits)}${state.config.exclusions?' · '+text(state.config.exclusions):''}</p>
        <h3>Wynik i pokrycie oceny w wybranych modułach</h3>
        ${moduleSummary||'<p>Raport obejmuje ustalenia bez przypisania do modułu.</p>'}
        ${keys.length?`<p class="pdf-small">${h(scoreMethod)} Wyniki liczy się osobno dla każdego modułu.</p>`:''}
      </section>`;

      const traces=findings.filter(({item})=>item.questionId).map(({item,source,anchor})=>{
        const snapshot=item.assessment;
        const answer=snapshot??source?.program.answers[item.questionId];
        return `<article id="${h(anchor)}" class="report-trace">
          <h4>${h(item.id)} · ${h(item.questionId)} · ${text(source?.question.question??item.title)}</h4>
          <p><b>Moduł:</b> ${source?`${h(source.program.template.name)} · wersja ${h(source.program.template.version)}`:'Brak jednoznacznego powiązania'}</p>
          <p><b>${snapshot?'Ocena w chwili utworzenia ustalenia':'Aktualna ocena'}:</b> ${answer?h(results[answer.status]):'Brak zapisu'}<br>
          <b>Uzasadnienie:</b> ${text(answer?.note)}<br><b>Dowody oceny:</b> ${proof(answer?.evidence)}</p>
        </article>`;
      }).join('');

      const issues=`<section class="pdf-section short-page"><h2>2. Pilne działania i ustalenia</h2>
        <h3>Do pięciu najpilniejszych działań</h3>
        ${priorities.length?`<ol>${priorities.map(({item})=>`<li><b>${text(item.id)} · ${h(labelRisk(item))}</b> — ${text(item.action)}</li>`).join('')}</ol>`:'<p>Brak zapisanych pilnych zaleceń.</p>'}
        <h3>Ustalenia według ryzyka</h3>
        ${findings.length?`<table class="pdf-table"><thead><tr><th>ID i ryzyko</th><th>Ustalenie i opis</th><th>Dowody</th></tr></thead><tbody>
          ${findings.map(({item,anchor})=>`<tr><td>${text(item.id)}<br>${h(labelRisk(item))}</td><td><b>${text(item.title)}</b><br>${text(item.observation)}
            ${item.questionId?`<br><a href="#${h(anchor)}">Pytanie ${h(item.questionId)} i jego ocena</a>`:''}</td><td>${proof(item.evidence)}</td></tr>`).join('')}</tbody></table>`:'<p>Brak zapisanych ustaleń dla tego zakresu.</p>'}
        ${traces?'<h3>Ślad oceny pytań</h3>'+traces:''}
      </section>`;

      const decisions=findings.filter(({item})=>item.decisions?.length||['closed','accepted'].includes(item.status)).map(({item})=>
        `<article class="report-trace"><h4>${h(item.id)} · ${h(labels[item.status])}</h4>
          ${item.decisions?.length?`<ol>${item.decisions.map(decision=>`<li><b>${h(decisionLabel(decision))}</b> · ${h(decision.date)} · ${h(decision.actor)}
            <br>${text(decision.note)}${decision.kind==='retest'?'<br>Dowód: '+proof(decision.evidence):''}</li>`).join('')}</ol>`:''}
          ${['closed','accepted'].includes(item.status)&&!latestClosingDecision(item)
            ?'<p>Wcześniejszy status. Brak pełnego zapisu decyzji.</p>':''}
        </article>`).join('');
      const plan=`<section class="pdf-section short-page"><h2>3. Plan naprawczy i dowody</h2>
        <h3>Kto, co i do kiedy</h3>
        ${findings.length?`<table class="pdf-table"><thead><tr><th>Ustalenie</th><th>Działanie</th><th>Właściciel</th><th>Termin</th></tr></thead><tbody>
          ${findings.map(({item})=>`<tr><td>${text(item.id)}<br>${h(labels[item.status])}</td><td>${text(item.action)}</td><td>${text(item.owner)}</td><td>${text(item.due)}</td></tr>`).join('')}</tbody></table>`:'<p>Brak zapisanych działań.</p>'}
        ${decisions?'<h3>Ponowne sprawdzenia i akceptacje ryzyka</h3>'+decisions:''}
        <h3>Lista powiązanych dowodów</h3>
        ${evidence.length?`<table class="pdf-table"><thead><tr><th>ID i opis</th><th>Źródło i data</th></tr></thead><tbody>
          ${evidence.map(item=>`<tr id="${h(evidenceAnchors.get(item.id.toLowerCase()))}"><td><b>${text(item.id)}</b> · ${text(item.title)}</td><td>${text(item.location)} · ${text(item.date)}</td></tr>`).join('')}</tbody></table>`:'<p>Brak powiązanych dowodów.</p>'}
        <p class="pdf-small">Wnioski są ograniczone do zakresu i zbadanej próby. Raport nie kwalifikuje firmy do KSC i nie stanowi certyfikatu.</p>
      </section>`;
      return heading+issues+plan;
    }

    return { render, bind, linkEvidence, report, reportStyles, renderModuleSelection, jumpToQuestion };
  }

  window.createAuditLearningUI=createLearningUI;
})();
