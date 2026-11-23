export interface OperationLabel {
  en: string
  pl: string
}
export interface OperationField {
  key: string
  label: OperationLabel
  type: string
  required: boolean
  maxLength: number
  options?: string[]
  fields?: OperationField[]
  help?: OperationLabel
}
export interface OperationSchema {
  schemaVersion: number
  key: string
  name: OperationLabel
  description: OperationLabel
  controls: string[]
  fields: OperationField[]
}
export type OperationValues = Record<string, string | Record<string, string>[]>

export function validateOperationForm(
  schema: OperationSchema,
  values: OperationValues,
  complete: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {}
  function check(
    fields: OperationField[],
    input: OperationValues | Record<string, string>,
    prefix: string,
  ) {
    for (const [key] of Object.entries(input))
      if (!fields.some((f) => f.key === key))
        errors[prefix + key] = "Unknown or duplicate field."
    for (const field of fields) {
      const key = prefix + field.key
      const value = input[field.key]
      if (field.type === "table") {
        if (value === undefined) {
          if (complete && field.required) errors[key] = "Required"
          continue
        }
        if (
          !Array.isArray(value) ||
          value.length > 50 ||
          (complete && field.required && !value.length)
        ) {
          errors[key] = "Expected 1–50 rows."
          continue
        }
        value.forEach((row, index) =>
          check(field.fields ?? [], row, `${key}.${index}.`),
        )
        continue
      }
      if (value !== undefined && typeof value !== "string") {
        errors[key] = "Expected text."
        continue
      }
      const text = typeof value === "string" ? value : ""
      if (complete && field.required && !text.trim()) errors[key] = "Required"
      if (text.length > field.maxLength) errors[key] = "Value is too long."
      if (!text) continue
      if (field.type === "select" && !field.options?.includes(text))
        errors[key] = "Invalid option."
      if (
        field.type === "date" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(text) ||
          !Number.isFinite(Date.parse(text)) ||
          new Date(text).toISOString().slice(0, 10) !== text)
      )
        errors[key] = "Invalid date."
      if (field.type === "datetime" && !Number.isFinite(Date.parse(text)))
        errors[key] = "Invalid date/time."
      if (field.type === "url") {
        try {
          if (!["http:", "https:"].includes(new URL(text).protocol))
            errors[key] = "Only HTTP(S) URLs are allowed."
        } catch {
          errors[key] = "Only HTTP(S) URLs are allowed."
        }
      }
    }
  }
  check(schema.fields, values, "")
  if (complete && schema.key === "D02" && values.outcome === "Successful") {
    for (const key of ["integrity", "functionality"])
      if (typeof values[key] !== "string" || !values[key].trim())
        errors[key] = "Verification results are required for success."
  }
  return errors
}
