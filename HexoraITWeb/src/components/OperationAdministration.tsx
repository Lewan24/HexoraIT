import { useEffect, useState } from "react"
import { tr, useLocale } from "../i18n"
import {
  operationsApi,
  type OperationTemplate,
  type OperationPolicy,
} from "../api/operations"
import {
  operationDefaults,
  type OperationSchema,
  type OperationValues,
} from "../lib/operationForm"
import OperationForm, {
  operationButtonClass as button,
  operationInputClass as input,
} from "./OperationForm"

function message(error: unknown) {
  return error instanceof Error ? error.message : tr("Unable to load records.")
}
function download(template: OperationTemplate) {
  const url = URL.createObjectURL(
    new Blob([template.schemaJson], { type: "application/json" }),
  )
  const link = document.createElement("a")
  link.href = url
  link.download = `${template.key}-v${template.version}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function OperationTemplateLibrary({
  org,
  templates,
  canManage,
  onChanged,
  onCreate,
}: {
  org: string
  templates: OperationTemplate[]
  canManage: boolean
  onChanged: () => void
  onCreate?: (template: OperationTemplate) => void
}) {
  const { i18n } = useLocale()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [scope, setScope] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<OperationTemplate | "import">()
  const [source, setSource] = useState("")
  const [preview, setPreview] = useState<OperationSchema>()
  const [previewValues, setPreviewValues] = useState<OperationValues>({})
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState("")
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  const latest = templates.filter(
    (t, i, all) => all.findIndex((v) => v.key === t.key) === i,
  )
  const filtered = latest.filter((template) => {
    const schema = JSON.parse(template.schemaJson) as OperationSchema
    return (
      (!category || (schema.category ?? template.key[0]) === category) &&
      (!scope || (scope === "organization") === !!template.organizationId) &&
      `${template.key} ${schema.name.en} ${schema.name.pl}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    )
  })
  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await action()
      onChanged()
      setNotice(tr("Template updated."))
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  async function publish() {
    if (!editing) return
    await run(async () => {
      if (editing === "import") await operationsApi.importTemplate(org, source)
      else await operationsApi.publish(org, editing.key, editing.id, source)
      setDirty(false)
      setEditing(undefined)
      setPreview(undefined)
    })
  }
  const errors = error && (
    <p
      role="alert"
      className="rounded-lg border border-red-500/30 p-3 text-sm text-red-400"
    >
      {error}
    </p>
  )
  if (editing)
    return (
      <section
        className="space-y-4 rounded-xl border border-edge-subtle bg-navy-800 p-4 sm:p-6"
        aria-busy={busy}
      >
        <h2 className="text-lg font-semibold text-ink-primary">
          {editing === "import"
            ? tr("Import organization template")
            : tr("Publish a new template version")}
        </h2>
        <p className="text-xs text-ink-muted">
          {tr(
            "Published versions stay immutable. Existing documents keep their original schema.",
          )}
        </p>
        {errors}
        {editing === "import" && (
          <label className="block text-xs text-ink-secondary">
            {tr("JSON file")}
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              className={`${input} mt-1`}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 128000) {
                  setError(tr("Template is too large."))
                  return
                }
                setSource(await file.text())
                setPreview(undefined)
                setDirty(true)
              }}
            />
          </label>
        )}
        <label className="block text-xs text-ink-secondary">
          {tr("Template schema")}
          <textarea
            className={`${input} mt-1 font-mono`}
            rows={22}
            maxLength={128000}
            value={source}
            disabled={busy}
            spellCheck={false}
            onChange={(e) => {
              setSource(e.target.value)
              setPreview(undefined)
              setDirty(true)
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={busy || !source.trim()}
            onClick={async () => {
              setBusy(true)
              setError("")
              try {
                const schema = await operationsApi.validateTemplate(org, source)
                setPreview(schema)
                setPreviewValues(operationDefaults(schema.fields))
              } catch (e) {
                setError(message(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            {tr("Validate schema")}
          </button>
          <button
            className={`${button} border-blue-500/40 text-blue-400`}
            disabled={busy || !source.trim()}
            onClick={publish}
          >
            {editing === "import"
              ? tr("Import template")
              : tr("Publish version")}
          </button>
          <button
            className={button}
            disabled={busy}
            onClick={() => {
              if (!dirty || window.confirm(tr("Discard unsaved changes?"))) {
                setDirty(false)
                setEditing(undefined)
                setError("")
                setPreview(undefined)
              }
            }}
          >
            {tr("Cancel")}
          </button>
        </div>
        {preview && (
          <section className="space-y-4 border-t border-edge-subtle pt-4">
            <p role="status" className="text-sm text-green-400">
              {tr("Schema is valid.")}
            </p>
            <h3 className="text-sm font-medium text-ink-primary">
              {tr("Form preview")}
            </h3>
            <OperationForm
              fields={preview.fields}
              values={previewValues}
              onChange={setPreviewValues}
              errors={{}}
            />
          </section>
        )}
      </section>
    )
  return (
    <section className="space-y-4" aria-busy={busy}>
      {errors}
      {notice && (
        <p role="status" className="text-sm text-green-400">
          {notice}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-ink-secondary">
          {tr("Search templates")}
          <input
            className={`${input} mt-1`}
            type="search"
            maxLength={200}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {tr("Category")}
          <select
            className={`${input} mt-1`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="">{tr("All")}</option>
            {["A", "B", "C", "D", "E", "F"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-secondary">
          {tr("Template scope")}
          <select
            className={`${input} mt-1`}
            value={scope}
            onChange={(e) => {
              setScope(e.target.value)
              setPage(1)
            }}
          >
            <option value="">{tr("All")}</option>
            <option value="system">{tr("System templates")}</option>
            <option value="organization">{tr("Organization templates")}</option>
          </select>
        </label>
        {canManage && (
          <button
            className={`${button} self-end`}
            disabled={busy}
            onClick={() => {
              setEditing("import")
              setSource("")
              setDirty(false)
              setError("")
            }}
          >
            {tr("Import template")}
          </button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.slice((page - 1) * 12, page * 12).map((t) => {
          const schema = JSON.parse(t.schemaJson) as OperationSchema
          return (
            <article
              key={t.id}
              className="min-w-0 rounded-xl border border-edge-subtle bg-navy-800 p-5"
            >
              <p className="mb-1 text-xs text-ink-muted">
                {t.organizationId
                  ? tr("Organization template")
                  : tr("System template")}{" "}
                · v{t.version} ·{" "}
                {tr(t.active === false ? "Inactive" : "Active")}
              </p>
              <h2 className="font-medium text-ink-primary">
                {t.key.startsWith("ORG_") ? "" : `${t.key} · `}
                {i18n.language === "en" ? schema.name.en : schema.name.pl}
              </h2>
              <p className="mt-2 text-sm text-ink-secondary">
                {i18n.language === "en"
                  ? schema.description.en
                  : schema.description.pl}
              </p>
              <p className="mt-3 text-xs text-ink-muted">
                {schema.controls.join(" · ")}
              </p>
              <details className="mt-4 text-xs text-ink-secondary">
                <summary className="cursor-pointer">
                  {tr("Template versions")}
                </summary>
                {templates
                  .filter((v) => v.key === t.key)
                  .map((v) => (
                    <details key={v.id} className="mt-3">
                      <summary className="cursor-pointer">
                        v{v.version} · {v.contentHash.slice(0, 12)}
                      </summary>
                      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(JSON.parse(v.schemaJson), null, 2)}
                      </pre>
                      <button
                        className={`${button} mt-2`}
                        onClick={() => download(v)}
                      >
                        {tr("Export JSON")}
                      </button>
                    </details>
                  ))}
              </details>
              <div className="mt-4 flex flex-wrap gap-2">
                {onCreate && t.active !== false && (
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => onCreate(t)}
                  >
                    {tr("New record")}
                  </button>
                )}
                <button className={button} onClick={() => download(t)}>
                  {tr("Export JSON")}
                </button>
                {canManage && (
                  <>
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await operationsApi.clone(org, t.id)
                          setScope("organization")
                          setCategory("")
                          setPage(1)
                        })
                      }
                    >
                      {tr("Clone to organization")}
                    </button>
                    {t.organizationId && (
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() => {
                          setEditing(t)
                          setSource(JSON.stringify(schema, null, 2))
                          setDirty(false)
                          setError("")
                        }}
                      >
                        {tr("Edit as new version")}
                      </button>
                    )}
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          operationsApi.activate(org, t, t.active === false),
                        )
                      }
                    >
                      {tr(t.active === false ? "Activate" : "Deactivate")}
                    </button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {!filtered.length && (
        <p role="status" className="p-6 text-center text-sm text-ink-muted">
          {tr("No records found.")}
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>
          {filtered.length} · {tr("Page")} {page}
        </span>
        <div className="flex gap-2">
          <button
            className={button}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {tr("Previous")}
          </button>
          <button
            className={button}
            disabled={page * 12 >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            {tr("Next")}
          </button>
        </div>
      </div>
    </section>
  )
}

export default function OperationPolicyEditor({
  org,
  initial,
  onSaved,
}: {
  org: string
  initial: OperationPolicy
  onSaved: (policy: OperationPolicy) => void
}) {
  useLocale()
  const [policy, setPolicy] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const options = [
    ["standardPreApproved", "Pre-approve standard changes"],
    ["requireLowRiskApproval", "Require approval for low-risk changes"],
    ["requireNormalApproval", "Require approval for normal changes"],
    [
      "separateHighRiskDuties",
      "Separate requester and implementer for high-risk changes",
    ],
    ["allowLowRiskSelfApproval", "Allow low-risk self-approval"],
    [
      "allowDocumentedExceptions",
      "Allow administrator policy exceptions with a reason",
    ],
  ] as const
  return (
    <form
      className="max-w-3xl space-y-5 rounded-xl border border-edge-subtle bg-navy-800 p-4 sm:p-6"
      aria-busy={busy}
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError("")
        setSaved(false)
        try {
          const next = await operationsApi.savePolicy(org, policy)
          setPolicy(next)
          onSaved(next)
          setSaved(true)
        } catch (e) {
          setError(message(e))
        } finally {
          setBusy(false)
        }
      }}
    >
      <h2 className="text-lg font-semibold text-ink-primary">
        {tr("Organization operations policy")}
      </h2>
      <p className="text-xs text-ink-muted">
        {tr(
          "High-risk changes always require approval. Exceptions record the authenticated administrator, reason and time.",
        )}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="space-y-3">
        <legend className="mb-3 text-sm font-medium text-ink-primary">
          {tr("Approval rules")}
        </legend>
        {options.map(([key, label]) => (
          <label
            key={key}
            className="flex items-start gap-3 text-sm text-ink-secondary"
          >
            <input
              className="mt-1 accent-blue-500"
              type="checkbox"
              checked={policy[key]}
              onChange={(e) => {
                setPolicy((p) => ({ ...p, [key]: e.target.checked }))
                setSaved(false)
              }}
            />
            {tr(label)}
          </label>
        ))}
      </fieldset>
      <label className="block text-xs text-ink-secondary">
        {tr("Evidence retention (days)")}
        <input
          className={`${input} mt-1`}
          type="number"
          required
          min={1}
          max={36500}
          value={policy.retentionDays}
          disabled={busy}
          onChange={(e) => {
            setPolicy((p) => ({ ...p, retentionDays: Number(e.target.value) }))
            setSaved(false)
          }}
        />
      </label>
      <p className="text-xs text-ink-muted">
        {tr(
          "Retention is organization policy data. Archived records are never deleted automatically.",
        )}
      </p>
      <label className="block text-xs text-ink-secondary">
        {tr("Reporting criteria and deadlines (JSON data)")}
        <textarea
          className={`${input} mt-1 font-mono`}
          rows={8}
          maxLength={16000}
          value={policy.reportingRulesJson}
          disabled={busy}
          spellCheck={false}
          onChange={(e) => {
            setPolicy((p) => ({ ...p, reportingRulesJson: e.target.value }))
            setSaved(false)
          }}
        />
      </label>
      <p className="text-xs text-ink-muted">
        {tr(
          "Maintain current authority references, criteria and deadlines here. These values do not execute code or determine legal reportability.",
        )}
      </p>
      <button
        className={`${button} border-blue-500/40 text-blue-400`}
        disabled={busy}
        type="submit"
      >
        {tr("Save policy")}
      </button>
      {saved && (
        <p role="status" className="text-sm text-green-400">
          {tr("Policy saved.")}
        </p>
      )}
    </form>
  )
}
