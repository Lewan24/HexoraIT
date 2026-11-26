(() => {
  'use strict';
  const { actionRows, evidenceReferences, latestClosingDecision, questionSource, recordDecision } = window.AUDIT_PROJECT_DATA;
  const labels={open:'Otwarte',doing:'W realizacji',retest:'Do ponownego sprawdzenia',closed:'Zamknięte',accepted:'Ryzyko zaakceptowane'};
  const outcomeLabels={effective:'Poprawka działa',ineffective:'Poprawka nie działa lub jest niepełna'};
  const decisionLabel=decision=>decision.kind==='acceptance'?'Akceptacja ryzyka':outcomeLabels[decision.outcome];
  const v=id=>document.getElementById(id);

  function createAuditFollowupUI({h,getState,save,refresh,showFinding,openQuestion,dateNow}) {
    let open=null, projectId=null;

    function renderBoard() {
      const state=getState();
      const owner=v('followup-owner'), period=v('followup-period');
      if(projectId!==state.id){
        projectId=state.id;
        owner.value='';
        period.value='open';
      }
      const selection=owner.value;
      const named=[...new Set(state.findings.map(item=>item.owner.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
      owner.innerHTML='<option value="">Wszyscy właściciele</option><option value="unassigned">Bez właściciela</option>'+
        named.map(name=>`<option value="owner:${h(name)}">${h(name)}</option>`).join('');
      if([...owner.options].some(option=>option.value===selection))owner.value=selection;
      const today=dateNow(), week=new Date();
      week.setDate(week.getDate()+7);
      const rows=actionRows(state.findings,owner.value==='unassigned'?'':owner.value?owner.value.slice(6):null,
        period.value,today,week.toLocaleDateString('sv-SE'));
      v('followup-count').textContent='Liczba ustaleń: '+rows.length;
      v('followup-table').innerHTML=rows.length?`<div class="table-wrap"><table><thead>
        <tr><th>Ustalenie i działanie</th><th>Właściciel</th><th>Termin</th><th>Status</th></tr></thead><tbody>
        ${rows.map(item=>{
          const overdue=item.due&&item.due<today&&!['closed','accepted'].includes(item.status);
          return `<tr><td><button type="button" class="pill-action" data-show-finding="${h(item.id)}">${h(item.id)} · ${h(item.title)}</button><br><small>${h(item.action||'Brak działania')}</small></td>
            <td>${h(item.owner||'Bez właściciela')}</td><td>${h(item.due||'Bez terminu')}${overdue?'<br><strong class="followup-warning">Po terminie</strong>':''}</td><td>${h(labels[item.status])}</td></tr>`;
        }).join('')}</tbody></table></div>`:'<p class="empty-state">Brak działań spełniających wybrane warunki.</p>';
    }

    function markup(finding) {
      const state=getState();
      const origin=questionSource(finding,state.learning.programs);
      const decisions=finding.decisions??[];
      const evidenceIds=state.evidence.map(item=>item.id);
      const closing=latestClosingDecision(finding);
      const missingProof=closing?.kind==='retest'?evidenceReferences(closing.evidence,evidenceIds).filter(ref=>!ref.known):[];
      return `<section class="followup-history" aria-label="Decyzje i ponowne sprawdzenia">
        ${origin?`<button type="button" class="pill-action" data-question-origin="${h(finding.id)}">Otwórz pytanie ${h(origin.question.id)} · ${h(origin.program.template.name)}</button>`:finding.questionId?'<p class="storage-note">Brak jednoznacznego powiązania pytania z modułem.</p>':''}
        ${['closed','accepted'].includes(finding.status)&&!closing?'<p class="followup-warning">Z wcześniejszego zapisu. Uzupełnij datę, osobę i podstawę decyzji.</p>':''}
        ${missingProof.length?`<p class="followup-warning">Brak dowodu zamknięcia w rejestrze: ${h(missingProof.map(ref=>ref.id).join(', '))}.</p>`:''}
        ${decisions.length?`<details><summary>Historia decyzji (${h(decisions.length)})</summary><ol>
          ${decisions.map(decision=>`<li><b>${h(decisionLabel(decision))}</b> · ${h(decision.date)} · ${h(decision.actor)}
            <p>${h(decision.note)}${decision.kind==='retest'?'<br>Dowód: '+evidenceReferences(decision.evidence,evidenceIds)
              .map(ref=>h(ref.id)+(ref.known?'':' (brak w rejestrze)')).join(', '):''}</p></li>`).join('')}</ol></details>`:''}
        <div class="button-row">
          <button type="button" class="btn btn-light btn-sm" data-decision-kind="retest" data-decision-id="${h(finding.id)}">Zapisz ponowne sprawdzenie</button>
          <button type="button" class="btn btn-light btn-sm" data-decision-kind="acceptance" data-decision-id="${h(finding.id)}">Zapisz akceptację ryzyka</button>
        </div>
      </section>`;
    }

    function start(finding, kind, outcome='') {
      const form=v('decision-form'), state=getState(), isRetest=kind==='retest';
      open={id:finding.id,projectId:state.id,kind};
      form.reset();
      form.elements.date.value=dateNow();
      form.elements.date.max=dateNow();
      form.elements.outcome.value=outcome;
      form.elements.outcome.required=isRetest;
      form.elements.evidence.required=isRetest;
      v('decision-heading').textContent=isRetest?'Zapisz ponowne sprawdzenie':'Zapisz akceptację ryzyka';
      v('decision-finding').textContent=finding.id+' · '+finding.title;
      v('decision-actor-label').textContent=isRetest?'Kto sprawdził poprawkę?':'Kto podjął decyzję?';
      v('decision-note-label').textContent=isRetest?'Co sprawdzono i jaki był wynik?':'Decyzja i uzasadnienie akceptacji';
      v('decision-retest-fields').hidden=!isRetest;
      v('decision-message').textContent=isRetest&&!state.evidence.length
        ?'Najpierw dodaj do rejestru dowód z ponownego sprawdzenia.':!isRetest?'Wpisz decyzję osoby uprawnionej do akceptacji ryzyka.':'';
      v('decision-evidence-list').innerHTML=state.evidence.map(item=>`<option value="${h(item.id)}">${h(item.title)}</option>`).join('');
      v('decision-dialog').showModal();
      form.elements.actor.focus();
    }

    function pickStatus(finding,control) {
      if (!['closed','accepted'].includes(control.value)) return false;
      const status=control.value;
      control.value=finding.status;
      start(finding,status==='closed'?'retest':'acceptance',status==='closed'?'effective':'');
      return true;
    }

    function bind() {
      for(const id of ['followup-owner','followup-period'])v(id).addEventListener('change',renderBoard);
      v('followup-table').addEventListener('click',event=>{
        const button=event.target.closest('[data-show-finding]');
        if(button)showFinding(button.dataset.showFinding);
      });
      v('findings-list').addEventListener('click',event=>{
        const command=event.target.closest('[data-decision-kind],[data-question-origin]');
        if(!command)return;
        const state=getState();
        const finding=state.findings.find(item=>item.id===(command.dataset.decisionId??command.dataset.questionOrigin));
        if(!finding)return;
        if(command.dataset.decisionKind)start(finding,command.dataset.decisionKind);
        else{
          const origin=questionSource(finding,state.learning.programs);
          if(origin)openQuestion(origin.key,origin.question.id);
        }
      });
      v('decision-cancel').addEventListener('click',()=>v('decision-dialog').close());
      v('decision-dialog').addEventListener('close',()=>{open=null;});
      v('decision-form').addEventListener('submit',event=>{
        event.preventDefault();
        const state=getState();
        if(!open||open.projectId!==state.id)return;
        const index=state.findings.findIndex(item=>item.id===open.id);
        if(index<0)return;
        const input={...Object.fromEntries(new FormData(event.currentTarget)),kind:open.kind};
        const result=recordDecision(state.findings[index],input,state.evidence.map(item=>item.id),dateNow());
        if(result.error){v('decision-message').textContent=result.error;return;}
        state.findings[index]=result.finding;
        save();
        v('decision-dialog').close();
        refresh();
        showFinding(result.finding.id);
      });
    }

    return { renderBoard, markup, pickStatus, bind };
  }

  window.AUDIT_FOLLOWUP = { createAuditFollowupUI, decisionLabel, labels };
})();
