/* Walidacja projektów schematu 2. Bez dostępu do DOM i pamięci przeglądarki. */
(() => {
  'use strict';
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = value => typeof value === 'string' ? value : '';
  const choice = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const progress = ['new', 'progress', 'waiting', 'done', 'na'];
  const assessment = ['unassessed', 'conform', 'partial', 'nonconform', 'unknown', 'notapp'];
  const findingStatus = ['open', 'doing', 'retest', 'closed', 'accepted'];

  function dateOnly(value) {
    if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000')) return '';
    const date = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : '';
  }

  function timestamp(value) {
    if (typeof value !== 'string' || !dateOnly(value.slice(0, 10)) ||
        !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) return null;
    const date = new Date(value);
    return Number.isFinite(date.valueOf()) ? date.toISOString() : null;
  }

  function risk(value) {
    const number = typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
    return Number.isFinite(number) ? Math.min(5, Math.max(1, Math.round(number))) : 3;
  }

  function fields(target, source, keys) {
    for (const key of keys) if (typeof source[key] === 'string') target[key] = source[key];
    return target;
  }

  function recordList(items, prefix, normalize) {
    if (items === undefined) return [];
    if (!Array.isArray(items) || !items.every(isRecord)) throw Error('Nieprawidłowa lista dowodów lub ustaleń.');
    const key = id => id.toLowerCase();
    const reserved = new Set(items.map(item => key(text(item.id).trim())));
    const used = new Set();
    let next = 1;
    return items.map(item => {
      let id = text(item.id).trim();
      if (!id || used.has(key(id))) {
        do { id = prefix + String(next++).padStart(3, '0'); } while (reserved.has(key(id)));
        reserved.add(key(id));
      }
      used.add(key(id));
      return { ...normalize(item), id };
    });
  }

  function normalizeProject(project, defaults, taskIds, requirementIds, blankTask) {
    if (!isRecord(project) || ![2, '2'].includes(project.schema))
      throw Error('Oczekiwano projektu w formacie 2.0.');
    for (const section of ['config', 'tasks', 'requirements', 'report']) {
      if (Object.hasOwn(project, section) && !isRecord(project[section]))
        throw Error('Nieprawidłowa sekcja projektu: ' + section);
    }
    const result = defaults();
    const config = project.config ?? {};
    fields(result.config, config, ['preset','name','org','lead','sponsor','type','depth','size','legal','legalEvidence','scope','exclusions','period','previous','targets']);
    for (const key of ['standards', 'topics']) {
      if (Array.isArray(config[key])) result.config[key] = config[key].filter(item => typeof item === 'string');
    }
    if (isRecord(config.tech)) {
      for (const key of Object.keys(result.config.tech)) if (typeof config.tech[key] === 'boolean') result.config.tech[key] = config.tech[key];
    }
    for (const [id, mode] of Object.entries(config.manual ?? {})) {
      if (taskIds.has(id) && ['include', 'exclude'].includes(mode)) result.config.manual[id] = mode;
    }
    for (const [id, item] of Object.entries(config.criterionManual ?? {})) {
      if (requirementIds.has(id) && isRecord(item) && ['include', 'exclude'].includes(item.mode))
        result.config.criterionManual[id] = { mode: item.mode, reason: text(item.reason) };
    }
    for (const [id, task] of Object.entries(project.tasks ?? {})) {
      if (!taskIds.has(id)) continue;
      if (!isRecord(task)) throw Error('Nieprawidłowa karta zadania: ' + id);
      const item = fields(blankTask(), task, ['evidence', 'owner', 'sample', 'notes', 'reason']);
      item.status = choice(task.status, progress, 'new');
      item.assessment = choice(task.assessment, assessment, 'unassessed');
      item.checks = [0, 1, 2].map(index => task.checks?.[index] === true);
      item.verified = task.verified === true;
      result.tasks[id] = item;
    }
    for (const [id, requirement] of Object.entries(project.requirements ?? {})) {
      if (!requirementIds.has(id)) continue;
      if (!isRecord(requirement)) throw Error('Nieprawidłowe kryterium: ' + id);
      result.requirements[id] = {
        status: choice(requirement.status, assessment, 'unassessed'),
        applicability: choice(requirement.applicability, ['pending', 'yes', 'no'], 'pending'),
        evidence: text(requirement.evidence), notes: text(requirement.notes)
      };
    }
    result.evidence = recordList(project.evidence, 'E-', item => ({
      task: text(item.task), title: text(item.title), kind: text(item.kind), date: dateOnly(item.date),
      location: text(item.location), owner: text(item.owner), classification: text(item.classification), verified: item.verified === true
    }));
    result.findings = recordList(project.findings, 'U-', item => ({
      task: text(item.task), title: text(item.title), criterion: text(item.criterion),
      observation: text(item.observation), evidence: text(item.evidence), impactText: text(item.impactText),
      likelihood: risk(item.likelihood), impact: risk(item.impact), action: text(item.action), owner: text(item.owner),
      due: dateOnly(item.due), status: choice(item.status, findingStatus, 'open'),
      managementResponse: text(item.managementResponse), retestEvidence: text(item.retestEvidence),
      ...(typeof item.questionId === 'string' ? { questionId: item.questionId } : {})
    }));
    const report = project.report ?? {};
    fields(result.report, report, ['classification', 'method', 'summary', 'limits', 'approved']);
    result.report.conclusion = choice(report.conclusion, ['none', 'limited', 'gaps', 'scoped'], 'none');
    if (typeof report.appendix === 'boolean') result.report.appendix = report.appendix;
    result.updated = timestamp(project.updated);
    result.changesSinceExport = Number.isSafeInteger(project.changesSinceExport) && project.changesSinceExport > 0 ? project.changesSinceExport : 0;
    return result;
  }

  const results = { unassessed:'Nie oceniono', conform:'Zgodne', partial:'Częściowo', nonconform:'Niezgodne', notapp:'Nie dotyczy' };
  const scores = { conform:1, partial:0.5, nonconform:0 };
  const findingScales = { niskie:[1,3], średnie:[2,3], wysokie:[4,4] };
  const idPattern = /^[a-z0-9-]{1,80}$/i;
  const questionFields = ['id','area','question','why','how','evidence','risk','riskReason','recommendation','reference','permission'];

  function indicators(values) {
    let eligible=0, assessed=0, points=0, excluded=0;
    for (const status of values) {
      if (status==='notapp') { excluded++; continue; }
      eligible++;
      if (Object.hasOwn(scores,status)) { assessed++; points+=scores[status]; }
    }
    return { eligible, assessed, excluded, unassessed:eligible-assessed, points,
      percent:assessed ? Math.round(points / eligible * 100) : null };
  }

  function findingFromQuestion(question, answer, id) {
    if (!['partial','nonconform'].includes(answer?.status)) return null;
    const [likelihood,impact] = findingScales[question.risk];
    return {
      id, questionId:question.id, task:question.id, title:question.question,
      criterion:question.reference, observation:results[answer.status]+(answer.note.trim()?' — '+answer.note.trim():' — uzupełnij opis na podstawie dowodu.'),
      evidence:answer.evidence, likelihood, impact, impactText:question.riskReason,
      action:question.recommendation, owner:'', due:'', status:'open', managementResponse:'', retestEvidence:''
    };
  }

  function riskLevel(product) {
    return product>=17?'Krytyczne':product>=10?'Wysokie':product>=5?'Umiarkowane':'Niskie';
  }

  function learningProgram(template) {
    return { template:structuredClone(template), answers:{} };
  }

  function normalizeLearning(value) {
    if (!isRecord(value) || !isRecord(value.programs)) throw Error('Nieprawidłowy zapis pytań.');
    const programs = {};
    for (const [key,program] of Object.entries(value.programs)) {
      const t = program?.template;
      if (!isRecord(t) || !idPattern.test(text(t.id)) || !Number.isSafeInteger(t.version) ||
          t.version<1 || key!==t.id+'-'+t.version || ![1,2].includes(t.level) ||
          !Array.isArray(t.areas) || !Array.isArray(t.questions) || !isRecord(program.answers) ||
          !t.areas.length || !t.questions.length)
        throw Error('Nieprawidłowy szablon zapisany w projekcie.');
      const areas = new Set();
      const safeAreas = t.areas.map(area => {
        if (!idPattern.test(text(area?.id)) || areas.has(area.id) || !text(area.name).trim())
          throw Error('Nieprawidłowy obszar w szablonie.');
        areas.add(area.id);
        return fields({},area,['id','name']);
      });
      const ids = new Set(), answers = {};
      const questions = t.questions.map(question => {
        if (!idPattern.test(text(question?.id)) || ids.has(question.id) || !areas.has(question.area) ||
            !questionFields.every(field=>text(question[field]).trim()) || question.permission!=='read' ||
            !Object.hasOwn(findingScales,question.risk))
          throw Error('Nieprawidłowe pytanie w zapisanym szablonie.');
        ids.add(question.id);
        const answer = program.answers[question.id];
        if (isRecord(answer)) {
          const note = text(answer.note);
          let status = Object.hasOwn(results,answer.status) ? answer.status : 'unassessed';
          if (status==='notapp' && !note.trim()) status='unassessed';
          answers[question.id] = { status, note, evidence:text(answer.evidence) };
        }
        return fields({},question,questionFields);
      });
      programs[key] = { template:{
        ...fields({},t,['id','name','description','audience','learning','duration']),
        version:t.version, level:t.level, areas:safeAreas, questions
      }, answers };
    }
    if (value.selected!==null && !Object.hasOwn(programs,value.selected)) throw Error('Brak wybranego szablonu w zapisie.');
    return { selected:value.selected, programs, consent:text(value.consent), step:Number.isInteger(value.step) ? Math.max(0,Math.min(6,value.step)) : 0 };
  }

  function newProject(legacy,id,mode='learning') {
    if (!idPattern.test(text(id))) throw Error('Nieprawidłowy identyfikator projektu.');
    return { ...legacy, schema:3, id, mode, auditDate:'', demo:false, learning:{ selected:null, programs:{}, consent:'', step:0 } };
  }

  function migrateProject(project,normalizeLegacy,id) {
    return newProject(normalizeLegacy(project),id,'auditor');
  }

  function normalizeV3(project,normalizeLegacy) {
    if (!isRecord(project) || project.schema!==3 || !idPattern.test(text(project.id)) ||
        !['learning','auditor'].includes(project.mode))
      throw Error('Nieprawidłowy projekt w formacie 3.');
    return { ...normalizeLegacy({ ...project,schema:2 }), schema:3, id:project.id, mode:project.mode,
      auditDate:dateOnly(project.auditDate), demo:project.demo===true, learning:normalizeLearning(project.learning) };
  }

  function normalizeWorkspace(value,normalizeLegacy) {
    if (!isRecord(value) || value.schema!==3 || !Array.isArray(value.projects) ||
        !Number.isSafeInteger(value.revision) || value.revision<0)
      throw Error('Nieprawidłowa lista projektów.');
    const projects = value.projects.map(project=>normalizeV3(project,normalizeLegacy));
    const ids = new Set(projects.map(project=>project.id));
    if (ids.size!==projects.length || (projects.length ? !ids.has(value.activeId) : value.activeId!==null))
      throw Error('Nieprawidłowe identyfikatory na liście projektów.');
    return { schema:3, revision:value.revision, activeId:value.activeId, projects };
  }

  window.AUDIT_PROJECT_DATA = { normalizeProject, dateOnly, risk, indicators, findingFromQuestion, riskLevel, results,
    learningProgram, newProject, migrateProject, normalizeV3, normalizeWorkspace };
})();
