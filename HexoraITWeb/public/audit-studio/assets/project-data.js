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
      managementResponse: text(item.managementResponse), retestEvidence: text(item.retestEvidence)
    }));
    const report = project.report ?? {};
    fields(result.report, report, ['classification', 'method', 'summary', 'limits', 'approved']);
    result.report.conclusion = choice(report.conclusion, ['none', 'limited', 'gaps', 'scoped'], 'none');
    if (typeof report.appendix === 'boolean') result.report.appendix = report.appendix;
    result.updated = timestamp(project.updated);
    result.changesSinceExport = Number.isSafeInteger(project.changesSinceExport) && project.changesSinceExport > 0 ? project.changesSinceExport : 0;
    return result;
  }

  window.AUDIT_PROJECT_DATA = { normalizeProject, dateOnly, risk };
})();
