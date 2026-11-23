import { tr, useLocale } from "../i18n"
import type {
  OperationField,
  OperationLabel,
  OperationValues,
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
}: {
  fields: OperationField[]
  values: OperationValues
  onChange: (values: OperationValues) => void
  errors: Record<string, string>
  disabled?: boolean
  prefix?: string
}) {
  const { i18n } = useLocale()
  const label = (text: OperationLabel) =>
    i18n.language === "en" ? text.en : text.pl
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const key = prefix + field.key
        const id = `operation-${key}`
        const error = errors[key]
        const value = values[field.key]
        const common = {
          id,
          disabled,
          className: operationInputClass,
          "aria-required": field.required,
          "aria-invalid": !!error,
          "aria-describedby": field.help || error ? `${id}-help` : undefined,
        }
        if (field.type === "table") {
          const rows = Array.isArray(value) ? value : []
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
                            i === index ? next as Record<string, string> : r,
                          ),
                        })
                      }
                      errors={errors}
                      disabled={disabled}
                      prefix={`${key}.${index}.`}
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
                  disabled={rows.length >= 50}
                  onClick={() =>
                    onChange({ ...values, [field.key]: [...rows, {}] })
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
        const change = (next: string) =>
          onChange({ ...values, [field.key]: next })
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
            {field.type === "select" ? (
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
