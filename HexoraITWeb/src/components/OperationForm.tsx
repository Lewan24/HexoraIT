import { tr, useLocale } from "../i18n"
import { operationVisible, operationDefaults } from "../lib/operationForm"
import type {
  OperationField,
  OperationLabel,
  OperationValues,
  OperationScalar,
} from "../lib/operationForm"

export const operationInputClass =
  "w-full min-w-0 rounded-lg border border-edge-default bg-navy-700 px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-blue-500 disabled:opacity-60"
export const operationButtonClass =
  "rounded-lg border border-edge-default px-3 py-2 text-xs text-ink-secondary hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50"

export default function OperationForm({
  fields,
  values,
  onChange,
  errors,
  disabled = false,
  prefix = "",
  root,
}: {
  fields: OperationField[]
  values: OperationValues
  onChange: (values: OperationValues) => void
  errors: Record<string, string>
  disabled?: boolean
  prefix?: string
  root?: OperationValues
}) {
  const { i18n } = useLocale()
  const label = (text: OperationLabel) =>
    i18n.language === "en" ? text.en : text.pl
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        if (!operationVisible(field.visibleWhen, values, root ?? values))
          return null
        const key = prefix + field.key
        const id = `operation-${key}`
        const error = errors[key]
        const value = values[field.key]
        const change = (next: OperationScalar | undefined) => {
          const updated = { ...values }
          if (next === undefined) delete updated[field.key]
          else updated[field.key] = next
          onChange(updated)
        }
        if (field.sensitivity === "Secret")
          return (
            <div
              key={key}
              className="col-span-full rounded-lg border border-edge-subtle p-3 text-xs text-ink-muted"
            >
              <strong>{label(field.label)}</strong>
              <p>
                {tr(
                  "Do not enter secrets. Store them in Passwords and reference the record.",
                )}
              </p>
            </div>
          )
        const common = {
          id,
          disabled,
          className: operationInputClass,
          "aria-required": field.required,
          "aria-invalid": !!error,
          "aria-describedby": field.help || error ? `${id}-help` : undefined,
        }
        if (field.type === "table") {
          const rows = Array.isArray(value)
            ? value.filter(
                (row): row is Record<string, OperationScalar> =>
                  typeof row === "object" && row !== null,
              )
            : []
          return (
            <fieldset
              key={key}
              className="col-span-full min-w-0 rounded-xl border border-edge-subtle p-4"
            >
              <legend className="px-1 text-sm font-medium text-ink-primary">
                {label(field.label)}
                {field.required ? " *" : ""}
              </legend>
              <div className="space-y-4">
                {rows.map((row, index) => (
                  <fieldset
                    key={index}
                    className="rounded-lg bg-navy-900/40 p-3"
                  >
                    <legend className="px-1 text-xs text-ink-muted">
                      {tr("Row")} {index + 1}
                    </legend>
                    <OperationForm
                      fields={field.fields ?? []}
                      values={row}
                      onChange={(next) =>
                        onChange({
                          ...values,
                          [field.key]: rows.map((r, i) =>
                            i === index
                              ? next as Record<string, OperationScalar>
                              : r,
                          ),
                        })
                      }
                      errors={errors}
                      disabled={disabled}
                      prefix={`${key}.${index}.`}
                      root={root ?? values}
                    />
                    {!disabled && (
                      <button
                        type="button"
                        className={`${operationButtonClass} mt-3`}
                        onClick={() =>
                          onChange({
                            ...values,
                            [field.key]: rows.filter((_, i) => i !== index),
                          })
                        }
                      >
                        {tr("Remove row")} {index + 1}
                      </button>
                    )}
                  </fieldset>
                ))}
              </div>
              {!disabled && (
                <button
                  type="button"
                  className={`${operationButtonClass} mt-3`}
                  disabled={rows.length >= (field.maxItems ?? 50)}
                  onClick={() =>
                    onChange({
                      ...values,
                      [field.key]: [
                        ...rows,
                        operationDefaults(
                          field.fields ?? [],
                        ) as Record<string, OperationScalar>,
                      ],
                    })
                  }
                >
                  {tr("Add row")}
                </button>
              )}
              {error && (
                <p role="alert" className="mt-2 text-xs text-red-400">
                  {tr(error)}
                </p>
              )}
            </fieldset>
          )
        }
        const text = typeof value === "string" ? value : ""
        if (field.type === "radio")
          return (
            <fieldset
              key={key}
              className="rounded-lg border border-edge-subtle p-3"
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-help` : undefined}
            >
              <legend className="text-xs text-ink-secondary">
                {label(field.label)}
                {field.required ? " *" : ""}
              </legend>
              <div className="flex flex-wrap gap-3">
                {field.options?.map((option, index) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-xs text-ink-primary"
                  >
                    <input
                      id={`${id}-${index}`}
                      type="radio"
                      name={id}
                      value={option}
                      checked={text === option}
                      disabled={disabled}
                      onChange={() => change(option)}
                    />
                    {tr(option)}
                  </label>
                ))}
              </div>
              {error && (
                <p
                  id={`${id}-help`}
                  role="alert"
                  className="mt-1 text-xs text-red-400"
                >
                  {tr(error)}
                </p>
              )}
            </fieldset>
          )
        const dateTimeText =
          field.type === "datetime" && text && Number.isFinite(Date.parse(text))
            ? new Date(
                new Date(text).getTime() -
                  new Date(text).getTimezoneOffset() * 60000,
              )
                .toISOString()
                .slice(0, 16)
            : ""
        return (
          <div
            key={key}
            className={field.type === "multiline" ? "col-span-full" : ""}
          >
            <label
              htmlFor={id}
              className="mb-1.5 block text-xs font-medium text-ink-secondary"
            >
              {label(field.label)}
              {field.required ? " *" : ""}
            </label>
            {field.type === "boolean" ? (
              <select
                {...common}
                value={value === true ? "true" : value === false ? "false" : ""}
                onChange={(e) =>
                  change(
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "true",
                  )
                }
              >
                <option value="">{tr("Select")}</option>
                <option value="true">{tr("Yes")}</option>
                <option value="false">{tr("No")}</option>
              </select>
            ) : field.type === "checkbox" ? (
              <input
                {...common}
                type="checkbox"
                checked={value === true}
                onChange={(e) => change(e.target.checked)}
              />
            ) : field.type === "multiselect" ? (
              <select
                {...common}
                multiple
                size={Math.min(field.options?.length ?? 3, 6)}
                value={
                  Array.isArray(value)
                    ? value.filter((v): v is string => typeof v === "string")
                    : []
                }
                onChange={(e) =>
                  change(
                    Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    ),
                  )
                }
              >
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {tr(option)}
                  </option>
                ))}
              </select>
            ) : field.type === "integer" || field.type === "decimal" ? (
              <input
                {...common}
                type="number"
                step={field.type === "integer" ? 1 : "any"}
                min={field.minimum ?? undefined}
                max={field.maximum ?? undefined}
                value={typeof value === "number" ? value : ""}
                onChange={(e) =>
                  change(
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            ) : field.type === "datetime" ? (
              <input
                {...common}
                type="datetime-local"
                value={dateTimeText}
                onChange={(e) =>
                  change(
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  )
                }
              />
            ) : field.type === "select" ? (
              <select
                {...common}
                value={text}
                onChange={(e) => change(e.target.value)}
              >
                <option value="">{tr("Select")}</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {tr(option)}
                  </option>
                ))}
              </select>
            ) : field.type === "multiline" ? (
              <textarea
                {...common}
                rows={3}
                maxLength={field.maxLength}
                value={text}
                onChange={(e) => change(e.target.value)}
              />
            ) : (
              <input
                {...common}
                type={
                  field.type === "date"
                    ? "date"
                    : field.type === "url"
                      ? "url"
                      : "text"
                }
                maxLength={field.maxLength}
                value={text}
                onChange={(e) => change(e.target.value)}
              />
            )}
            {(field.help || error) && (
              <p
                id={`${id}-help`}
                className={`mt-1 text-xs ${
                  error ? "text-red-400" : "text-ink-muted"
                }`}
                role={error ? "alert" : undefined}
              >
                {error ? tr(error) : field.help && label(field.help)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
