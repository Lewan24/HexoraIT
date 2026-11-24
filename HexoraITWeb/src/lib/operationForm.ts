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
  minLength?: number
  minimum?: number
  maximum?: number
  maxItems?: number
  pattern?: "guid" | "hostname" | "sha256"
  defaultValue?: OperationScalar | null
  visibleWhen?: OperationCondition | null
  sensitivity?: "Normal" | "Restricted" | "Secret"
}
export interface OperationCondition {
  match: "AND" | "OR"
  rules: OperationPredicate[]
  groups?: OperationCondition[]
}
export interface OperationPredicate {
  field: string
  operator: string
  value?: string | number | boolean | null | (string | number | boolean | null)[]
}
export interface OperationSchema {
  schemaVersion: number
  key: string
  name: OperationLabel
  description: OperationLabel
  controls: string[]
  fields: OperationField[]
  kind?: "Change" | "Record"
  requiresApproval?: boolean
  validationProfile?: string | null
  category?: string | null
}
export type OperationScalar = string | number | boolean | string[]
export type OperationValues = Record<string, OperationScalar | Record<string, OperationScalar>[]>

const patterns = {
  guid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  hostname: /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,251}[a-zA-Z0-9]$/,
  sha256: /^[a-fA-F0-9]{64}$/,
}
export function operationVisible(
  condition: OperationCondition | null | undefined,
  scope: OperationValues,
  root = scope,
): boolean {
  if (!condition) return true
  const equal = (a: unknown, b: unknown) =>
    JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  const tests = condition.rules
    .map((rule) => {
      const actual = Object.hasOwn(scope, rule.field)
        ? scope[rule.field]
        : Object.hasOwn(root, rule.field)
          ? root[rule.field]
          : undefined
      const empty =
        actual == null ||
        (typeof actual === "string" && !actual.trim()) ||
        (Array.isArray(actual) && !actual.length)
      switch (rule.operator) {
        case "equals":
          return equal(actual, rule.value)
        case "notEquals":
          return !equal(actual, rule.value)
        case "in":
          return (
            Array.isArray(rule.value) &&
            rule.value.some((v) => equal(actual, v))
          )
        case "notIn":
          return (
            Array.isArray(rule.value) &&
            !rule.value.some((v) => equal(actual, v))
          )
        case "empty":
          return empty
        case "notEmpty":
          return !empty
        case "greaterThan":
          return (
            typeof actual === "number" &&
            typeof rule.value === "number" &&
            actual > rule.value
          )
        case "lessThan":
          return (
            typeof actual === "number" &&
            typeof rule.value === "number" &&
            actual < rule.value
          )
        default:
          return false
      }
    })
    .concat(
      (condition.groups ?? []).map((group) =>
        operationVisible(group, scope, root),
      ),
    )
  return condition.match === "AND" ? tests.every(Boolean) : tests.some(Boolean)
}
export function operationDefaults(fields: OperationField[]): OperationValues {
  return Object.fromEntries(
    fields
      .filter(
        (f) =>
          f.sensitivity !== "Secret" &&
          f.sensitivity !== "Restricted" &&
          f.defaultValue !== undefined &&
          f.defaultValue !== null,
      )
      .map((f) => [f.key, f.defaultValue]),
  ) as OperationValues
}

export function validateOperationForm(
  schema: OperationSchema,
  values: OperationValues,
  complete: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {}
  function check(
    fields: OperationField[],
    input: OperationValues,
    prefix: string,
    activeComplete = complete,
  ) {
    for (const [key] of Object.entries(input))
      if (!fields.some((f) => f.key === key))
        errors[prefix + key] = "Unknown or duplicate field."
    for (const field of fields) {
      const key = prefix + field.key
      const value = input[field.key]
      const required =
        activeComplete &&
        field.required &&
        operationVisible(field.visibleWhen, input, values)
      if (field.sensitivity === "Secret") {
        if (value !== undefined && value !== null)
          errors[key] = "Secrets must be stored in the credential vault."
        continue
      }
      if (field.type === "table") {
        if (value === undefined) {
          if (required) errors[key] = "Required"
          continue
        }
        if (
          !Array.isArray(value) ||
          value.length > (field.maxItems ?? 50) ||
          (required && !value.length) ||
          value.some(
            (row) =>
              typeof row !== "object" || row === null || Array.isArray(row),
          )
        ) {
          errors[key] = "Expected 1–50 rows."
          continue
        }
        value.forEach((row, index) =>
          check(
            field.fields ?? [],
            row as Record<string, OperationScalar>,
            `${key}.${index}.`,
            activeComplete &&
              operationVisible(field.visibleWhen, input, values),
          ),
        )
        continue
      }
      if (
        ["integer", "decimal", "boolean", "checkbox", "multiselect"].includes(
          field.type,
        )
      ) {
        if (value === undefined || value === null) {
          if (required) errors[key] = "Required"
          continue
        }
        if (field.type === "boolean" || field.type === "checkbox") {
          if (typeof value !== "boolean")
            errors[key] = "Expected true or false."
        } else if (field.type === "multiselect") {
          if (
            !Array.isArray(value) ||
            value.length > (field.maxItems ?? 50) ||
            (required && !value.length) ||
            value.some(
              (v) => typeof v !== "string" || !field.options?.includes(v),
            ) ||
            new Set<unknown>(value).size !== value.length
          )
            errors[key] = "Invalid choices."
        } else if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          (field.type === "integer" && !Number.isInteger(value))
        )
          errors[key] = "Invalid number."
        else if (
          (field.minimum !== undefined &&
            field.minimum !== null &&
            value < field.minimum) ||
          (field.maximum !== undefined &&
            field.maximum !== null &&
            value > field.maximum)
        )
          errors[key] = "Number is outside the allowed range."
        continue
      }
      if (value !== undefined && typeof value !== "string") {
        errors[key] = "Expected text."
        continue
      }
      const text = typeof value === "string" ? value : ""
      if (required && !text.trim()) errors[key] = "Required"
      if (text.length > field.maxLength) errors[key] = "Value is too long."
      if (text.length > 0 && text.length < (field.minLength ?? 0))
        errors[key] = "Value is too short."
      if (text && field.pattern && !patterns[field.pattern].test(text))
        errors[key] = "Value does not match the allowed format."
      if (!text) continue
      if (
        ["select", "radio"].includes(field.type) &&
        !field.options?.includes(text)
      )
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
  if (
    complete &&
    (schema.key === "D02" || schema.validationProfile === "RestoreTest") &&
    values.outcome === "Successful"
  ) {
    for (const key of ["integrity", "functionality"])
      if (typeof values[key] !== "string" || !(values[key] as string).trim())
        errors[key] = "Verification results are required for success."
  }
  return errors
}

export interface OperationTemplateOption<T> {
  template: T
  schema: OperationSchema
}

export function searchOperationTemplates<T extends { key: string }>(options: readonly OperationTemplateOption<T>[], query: string) {
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ł', 'l')
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
  return options.filter(({ template, schema }) => {
    const text = normalize([template.key, schema.name.en, schema.name.pl, schema.description.en, schema.description.pl].join(' '))
    return terms.every(term => text.includes(term))
  })
}

export function compatibleOperationValues(source: OperationSchema, target: OperationSchema, previous: OperationValues) {
  const values = operationDefaults(target.fields)
  for (const field of target.fields) {
    if (field.sensitivity === 'Secret' || !Object.hasOwn(previous, field.key) ||
        !source.fields.some(current => current.key === field.key && current.type === field.type && current.sensitivity === field.sensitivity)) continue
    const candidate = { ...values, [field.key]: previous[field.key]! }
    const errors = validateOperationForm(target, candidate, false)
    if (!Object.keys(errors).some(key => key === field.key || key.startsWith(field.key + '.')))
      values[field.key] = previous[field.key]!
  }
  return values
}
