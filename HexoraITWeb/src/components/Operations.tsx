import { useEffect, useState } from "react"
import { ArrowLeft, FileText, Plus, Search } from "lucide-react"
import { tr, useLocale, locale } from "../i18n"
import { useApp } from "../context/useApp"
import { useAuth } from "../context/useAuth"
import {
  operationsApi,
  type OperationDetail,
  type OperationInput,
  type OperationList,
  type OperationTemplate,
} from "../api/operations"
import {
  validateOperationForm,
  type OperationSchema,
  type OperationValues,
} from "../lib/operationForm"
import OperationForm, {
  operationButtonClass as button,
  operationInputClass as input,
} from "./OperationForm"

function errorText(error: unknown) {
  return error instanceof Error ? error.message : tr("Unable to load records.")
}
function displayDate(date: string) {
  return new Date(date).toLocaleString(locale())
}

export default function Operations({ assetId }: { assetId?: string }) {
  useLocale()
  const { currentOrg, canRead } = useApp()
  if (!currentOrg || !canRead("operations"))
    return <p className="p-6 text-ink-muted">{tr("Access forbidden")}</p>
  return (
    <OperationWorkspace
      key={`${currentOrg.id}:${assetId ?? ""}`}
      organizationId={currentOrg.id}
      assetId={assetId}
    />
  )
}

function OperationWorkspace({
  organizationId: org,
  assetId,
}: {
  organizationId: string
  assetId?: string
}) {
  const { i18n } = useLocale()
  const { canWrite } = useApp()
  const { user } = useAuth()
  const [selected, setSelected] = useState<string>()
  const [creating, setCreating] = useState<OperationTemplate>()
  const [templates, setTemplates] = useState<OperationTemplate[]>([])
  const [list, setList] = useState<OperationList>()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [risk, setRisk] = useState("")
  const [type, setType] = useState("")
  const [sort, setSort] = useState("modified")
  const [section, setSection] = useState("register")
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    operationsApi
      .templates(org)
      .then((data) => {
        if (active)
          setTemplates(
            data.filter(
              (t, i, all) => all.findIndex((v) => v.key === t.key) === i,
            ),
          )
      })
      .catch((e) => {
        if (active) setError(errorText(e))
      })
    return () => {
      active = false
    }
  }, [org])
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setLoading(true)
      setError("")
      operationsApi
        .list(org, {
          search,
          status: section === "approvals" ? "Awaiting Approval" : status,
          risk,
          type,
          sort,
          ...(section === "mine" && user ? { requester: user.id } : {}),
          ...(assetId ? { assetId } : {}),
          page: String(page),
          pageSize: "25",
        })
        .then((data) => {
          if (active) setList(data)
        })
        .catch((e) => {
          if (active) {
            setError(errorText(e))
            setList(undefined)
          }
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 200)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [
    org,
    search,
    status,
    risk,
    type,
    sort,
    section,
    page,
    assetId,
    user,
    refresh,
  ])
  const back = () => {
    setSelected(undefined)
    setCreating(undefined)
    setRefresh((n) => n + 1)
  }
  if (selected || creating)
    return (
      <OperationEditor
        key={selected ?? creating?.id}
        org={org}
        id={selected}
        template={creating}
        assetId={assetId}
        onBack={back}
        onCreated={(id) => {
          setCreating(undefined)
          setSelected(id)
        }}
      />
    )
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">
            {assetId ? tr("Related Changes") : tr("IT Operations & Changes")}
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            {tr("Changes, operational records and security evidence")}
          </p>
        </div>
        {canWrite("operations") && (
          <label className="flex max-w-full min-w-0 flex-wrap items-center gap-2 text-xs text-ink-secondary">
            <Plus size={16} aria-hidden="true" />
            {tr("New record")}
            <select
              className={input}
              value=""
              onChange={(e) =>
                setCreating(templates.find((t) => t.id === e.target.value))
              }
            >
              <option value="">{tr("Select template")}</option>
              {templates.map((t) => {
                const s = JSON.parse(t.schemaJson) as OperationSchema
                return (
                  <option key={t.id} value={t.id}>
                    {t.key} · {i18n.language === "en" ? s.name.en : s.name.pl}
                  </option>
                )
              })}
            </select>
          </label>
        )}
      </div>
      <nav
        aria-label={tr("IT Operations & Changes")}
        className="flex flex-wrap gap-2"
      >
        {([
          ["register", "Change Register"],
          ["mine", "My Documents"],
          ["approvals", "Pending Approvals"],
          ["templates", "Document Templates"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            className={`${button} ${
              section === key ? "border-blue-500 text-blue-400" : ""
            }`}
            aria-current={section === key ? "page" : undefined}
            onClick={() => {
              setSection(key)
              setPage(1)
            }}
          >
            {tr(label)}
          </button>
        ))}
      </nav>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 p-3 text-sm text-red-400"
        >
          {error}
        </p>
      )}
      {section === "templates" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => {
            const schema = JSON.parse(t.schemaJson) as OperationSchema
            return (
              <article
                key={t.id}
                className="rounded-xl border border-edge-subtle bg-navy-800 p-5"
              >
                <h2 className="font-medium text-ink-primary">
                  {t.key} ·{" "}
                  {i18n.language === "en" ? schema.name.en : schema.name.pl}
                </h2>
                <p className="mt-2 text-sm text-ink-secondary">
                  {i18n.language === "en"
                    ? schema.description.en
                    : schema.description.pl}
                </p>
                <p className="mt-3 text-xs text-ink-muted">
                  v{t.version} · {schema.controls.join(" · ")}
                </p>
                <details className="mt-4 text-xs text-ink-secondary">
                  <summary className="cursor-pointer">
                    {tr("Template schema")}
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(schema, null, 2)}
                  </pre>
                </details>
                {canWrite("operations") && (
                  <button
                    className={`${button} mt-4`}
                    onClick={() => setCreating(t)}
                  >
                    {tr("New record")}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs text-ink-secondary">
              <span className="mb-1 flex items-center gap-1">
                <Search size={12} aria-hidden="true" />
                {tr("Search")}
              </span>
              <input
                className={input}
                type="search"
                value={search}
                maxLength={200}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>
            <label className="text-xs text-ink-secondary">
              {tr("Status")}
              <select
                className={`${input} mt-1`}
                disabled={section === "approvals"}
                value={section === "approvals" ? "Awaiting Approval" : status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{tr("All")}</option>
                {[
                  "Draft",
                  "Submitted",
                  "Under Review",
                  "Awaiting Approval",
                  "Approved",
                  "Scheduled",
                  "In Progress",
                  "Verification",
                  "Completed",
                  "Closed",
                  "Rejected",
                  "Cancelled",
                  "Failed",
                  "Rolled Back",
                  "Archived",
                ].map((s) => (
                  <option key={s} value={s}>
                    {tr(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-secondary">
              {tr("Risk")}
              <select
                className={`${input} mt-1`}
                value={risk}
                onChange={(e) => {
                  setRisk(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{tr("All")}</option>
                {["Low", "Medium", "High"].map((s) => (
                  <option key={s} value={s}>
                    {tr(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-secondary">
              {tr("Change type")}
              <select
                className={`${input} mt-1`}
                value={type}
                onChange={(e) => {
                  setType(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{tr("All")}</option>
                {["Standard", "Normal", "Emergency"].map((s) => (
                  <option key={s} value={s}>
                    {tr(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-secondary">
              {tr("Sort by")}
              <select
                className={`${input} mt-1`}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value)
                  setPage(1)
                }}
              >
                <option value="modified">{tr("Last modified")}</option>
                <option value="number">{tr("Number")}</option>
                <option value="title">{tr("Title")}</option>
              </select>
            </label>
          </div>
          <div
            aria-busy={loading}
            className="overflow-x-auto rounded-xl border border-edge-subtle bg-navy-800"
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-navy-700 text-xs text-ink-muted">
                <tr>
                  {["Number", "Title", "Status", "Risk", "Last modified"].map(
                    (t) => (
                      <th key={t} scope="col" className="px-4 py-3">
                        {tr(t)}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-subtle">
                {list?.items.map((r) => (
                  <tr key={r.id} className="text-ink-secondary">
                    <td className="px-4 py-3 font-mono text-xs">{r.number}</td>
                    <td className="px-4 py-3">
                      <button
                        className="text-left text-blue-400 underline-offset-4 hover:underline focus-visible:underline"
                        onClick={() => setSelected(r.id)}
                      >
                        {r.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs">{tr(r.status)}</td>
                    <td className="px-4 py-3 text-xs">{tr(r.risk)}</td>
                    <td className="px-4 py-3 text-xs">
                      {displayDate(r.modifiedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list?.items.length && (
              <p
                role="status"
                className="p-8 text-center text-sm text-ink-muted"
              >
                {loading ? tr("loading...") : tr("No records found.")}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
            <span>
              {tr("Records")}: {list?.total ?? 0} · {tr("Page")} {page}
            </span>
            <div className="flex gap-2">
              <button
                className={button}
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                {tr("Previous")}
              </button>
              <button
                className={button}
                disabled={!list || page * 25 >= list.total || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {tr("Next")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function OperationEditor({
  org,
  id,
  template,
  assetId,
  onBack,
  onCreated,
}: {
  org: string
  id?: string
  template?: OperationTemplate
  assetId?: string
  onBack: () => void
  onCreated: (id: string) => void
}) {
  const { i18n } = useLocale()
  const { assets, canWrite } = useApp()
  const [detail, setDetail] = useState<OperationDetail>()
  const [schema, setSchema] = useState<OperationSchema | undefined>(() =>
    template ? JSON.parse(template.schemaJson) as OperationSchema : undefined,
  )
  const [form, setForm] = useState<OperationInput>({
    templateVersionId: template?.id ?? "",
    title: "",
    description: "",
    values: {},
    risk: "Medium",
    priority: "Medium",
    changeType: "Normal",
    assetId: assetId ?? null,
    plannedStart: null,
    plannedEnd: null,
  })
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [target, setTarget] = useState("")
  const [reason, setReason] = useState("")
  const [snapshot, setSnapshot] = useState<string>()
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!id) return
    let active = true
    operationsApi
      .detail(org, id)
      .then((d) => {
        if (!active) return
        setDetail(d)
        setSchema(d.schema)
        setForm({ ...d.record, values: d.values })
        setDirty(false)
        setError("")
        setTarget("")
        setReason("")
        setErrors({})
      })
      .catch((e) => {
        if (active) setError(errorText(e))
      })
    return () => {
      active = false
    }
  }, [org, id, reload])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  const editable = !id ? canWrite("operations") : detail?.canEdit
  const update = (patch: Partial<OperationInput>) => {
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
    setErrors({})
  }
  async function save() {
    if (!schema) return
    const validation = validateOperationForm(schema, form.values, false)
    if (!form.title.trim()) validation.title = "Required"
    setErrors(validation)
    if (Object.keys(validation).length) return
    setBusy(true)
    setError("")
    try {
      if (id) {
        await operationsApi.save(org, id, form)
        setDirty(false)
        setReload((n) => n + 1)
      } else {
        const created = await operationsApi.create(org, form)
        setDirty(false)
        onCreated(created.id)
      }
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function transition() {
    if (!detail || !schema || !id || !target) return
    if (target === "Submitted") {
      const validation = validateOperationForm(schema, form.values, true)
      setErrors(validation)
      if (Object.keys(validation).length) {
        setError(tr("Complete the required fields before submission."))
        return
      }
    }
    setBusy(true)
    setError("")
    try {
      await operationsApi.transition(
        org,
        id,
        detail.record.revisionToken,
        target,
        reason,
      )
      setReload((n) => n + 1)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function exportPdf() {
    if (!id || !detail) return
    setBusy(true)
    setError("")
    try {
      const blob = await operationsApi.pdf(
        org,
        id,
        i18n.language === "en" ? "en" : "pl",
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${detail.record.number}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  if (!schema)
    return (
      <div className="p-6">
        <button className={button} onClick={onBack}>
          {tr("Back")}
        </button>
        <p
          role={error ? "alert" : "status"}
          className="mt-4 text-ink-secondary"
        >
          {error || tr("loading...")}
        </p>
      </div>
    )
  const localDate = (v: string | null) =>
    v
      ? new Date(
          new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : ""
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6" aria-busy={busy}>
      <button
        className={`${button} flex items-center gap-2`}
        disabled={busy}
        onClick={() => {
          if (!dirty || window.confirm(tr("Discard unsaved changes?"))) onBack()
        }}
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {tr("Back to register")}
      </button>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-ink-muted">
            {detail?.record.number ?? tr("New record")} · {schema.key} · v
            {detail?.template.version ?? template?.version}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-ink-primary">
            {i18n.language === "en" ? schema.name.en : schema.name.pl}
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            {tr(detail?.record.status ?? "Draft")}
          </p>
        </div>
        {detail && detail.record.status !== "Draft" && (
          <button className={button} disabled={busy} onClick={exportPdf}>
            {tr("Export PDF")}
          </button>
        )}
      </header>
      <p className="text-sm text-ink-secondary">
        {i18n.language === "en" ? schema.description.en : schema.description.pl}
      </p>
      <p className="text-xs text-ink-muted">
        {tr(
          "Do not enter secrets. Store them in Passwords and reference the record.",
        )}
      </p>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 p-3 text-sm text-red-400"
        >
          {error}
          {id && (
            <button
              className={`${button} ml-3`}
              disabled={busy}
              onClick={() => {
                if (!dirty || window.confirm(tr("Discard unsaved changes?")))
                  setReload((n) => n + 1)
              }}
            >
              {tr("Reload")}
            </button>
          )}
        </div>
      )}
      <form
        className="space-y-5 rounded-xl border border-edge-subtle bg-navy-800 p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
        noValidate
      >
        <fieldset
          disabled={!editable || busy}
          className="grid min-w-0 gap-4 sm:grid-cols-2"
        >
          <label className="col-span-full text-xs text-ink-secondary">
            {tr("Title")} *
            <input
              className={`${input} mt-1`}
              value={form.title}
              required
              maxLength={200}
              aria-invalid={!!errors.title}
              aria-describedby={
                errors.title ? "operation-title-error" : undefined
              }
              onChange={(e) => update({ title: e.target.value })}
            />
            {errors.title && (
              <span
                id="operation-title-error"
                role="alert"
                className="text-red-400"
              >
                {tr(errors.title)}
              </span>
            )}
          </label>
          <label className="col-span-full text-xs text-ink-secondary">
            {tr("Description")}
            <textarea
              className={`${input} mt-1`}
              value={form.description}
              maxLength={10000}
              rows={3}
              onChange={(e) => update({ description: e.target.value })}
            />
          </label>
          {(["changeType", "risk", "priority"] as const).map((key) => (
            <label key={key} className="text-xs text-ink-secondary">
              {tr(
                key === "changeType"
                  ? "Change type"
                  : key === "risk"
                    ? "Risk"
                    : "Priority",
              )}
              <select
                className={`${input} mt-1`}
                value={form[key]}
                onChange={(e) => update({ [key]: e.target.value })}
              >
                {(key === "changeType"
                  ? ["Standard", "Normal", "Emergency"]
                  : ["Low", "Medium", "High"]
                ).map((value) => (
                  <option key={value} value={value}>
                    {tr(value)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="text-xs text-ink-secondary">
            {tr("Related asset")}
            <select
              className={`${input} mt-1`}
              value={form.assetId ?? ""}
              onChange={(e) => update({ assetId: e.target.value || null })}
            >
              <option value="">{tr("None")}</option>
              {form.assetId && !assets.some((a) => a.id === form.assetId) && (
                <option value={form.assetId}>{form.assetId}</option>
              )}
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {(["plannedStart", "plannedEnd"] as const).map((key) => (
            <label key={key} className="text-xs text-ink-secondary">
              {tr(key === "plannedStart" ? "Planned start" : "Planned end")}
              <input
                className={`${input} mt-1`}
                type="datetime-local"
                value={localDate(form[key])}
                onChange={(e) =>
                  update({
                    [key]: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </label>
          ))}
        </fieldset>
        <OperationForm
          fields={schema.fields}
          values={form.values}
          onChange={(values: OperationValues) => update({ values })}
          errors={errors}
          disabled={!editable || busy}
        />
        {editable && (
          <div className="flex items-center gap-3 border-t border-edge-subtle pt-4">
            <button
              type="submit"
              className={`${button} border-blue-500/40 bg-blue-500/10 text-blue-400`}
              disabled={busy || (!dirty && !!id)}
            >
              {tr("Save draft")}
            </button>
            <span role="status" className="text-xs text-ink-muted">
              {dirty ? tr("Unsaved changes") : detail ? tr("Saved") : ""}
            </span>
          </div>
        )}
      </form>
      {detail && detail.allowedTransitions.length > 0 && (
        <section className="space-y-3 rounded-xl border border-edge-subtle bg-navy-800 p-5">
          <h2 className="text-sm font-semibold text-ink-primary">
            {tr("Workflow action")}
          </h2>
          <label className="block text-xs text-ink-secondary">
            {tr("Action")}
            <select
              className={`${input} mt-1`}
              value={target}
              disabled={busy}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">{tr("Select")}</option>
              {detail.allowedTransitions.map((t) => (
                <option key={t} value={t}>
                  {tr(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-ink-secondary">
            {tr("Decision / execution / verification notes")}
            <textarea
              className={`${input} mt-1`}
              rows={3}
              maxLength={4000}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className={button}
            disabled={busy || dirty || !target}
            onClick={transition}
          >
            {tr("Apply action")}
          </button>
          {dirty && (
            <p className="text-xs text-ink-muted">
              {tr("Save draft before applying a workflow action.")}
            </p>
          )}
        </section>
      )}
      {detail && (
        <section className="rounded-xl border border-edge-subtle bg-navy-800 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-primary">
            <FileText size={15} aria-hidden="true" />
            {tr("Activity and revisions")}
          </h2>
          <ol className="space-y-3">
            {detail.activity.map((a) => (
              <li key={a.id} className="text-xs text-ink-secondary">
                <strong>{tr(a.eventType)}</strong> · {displayDate(a.occurredAt)}
                <p className="mt-1 break-all font-mono text-[11px] text-ink-muted">
                  {a.actorId} · {tr(a.fromStatus)} → {tr(a.toStatus)}
                </p>
              </li>
            ))}
          </ol>
          <details className="mt-5 text-xs text-ink-secondary">
            <summary className="cursor-pointer">
              {tr("Revision history")}
            </summary>
            <ul className="mt-3 space-y-2">
              {detail.revisions.map((r) => (
                <li key={r.id}>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        const v = await operationsApi.revision(
                          org,
                          detail.record.id,
                          r.id,
                        )
                        setSnapshot(
                          JSON.stringify(JSON.parse(v.snapshotJson), null, 2),
                        )
                      } catch (e) {
                        setError(errorText(e))
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    {displayDate(r.createdAt)} · {r.revisionToken.slice(0, 8)}
                  </button>
                </li>
              ))}
            </ul>
            {snapshot && (
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-navy-900 p-3">
                {snapshot}
              </pre>
            )}
          </details>
        </section>
      )}
      <p className="text-xs text-ink-muted">
        {schema.controls.join(" · ")}
        <br />
        {tr(
          "Control references support evidence collection; they do not certify compliance.",
        )}
      </p>
    </div>
  )
}
