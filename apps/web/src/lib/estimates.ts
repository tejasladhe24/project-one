export const ESTIMATE_TYPES = [
  "not_in_use",
  "exponential",
  "fibonacci",
  "linear",
  "t_shirt",
] as const

export type EstimateType = (typeof ESTIMATE_TYPES)[number]

export type TeamEstimateSettings = {
  estimateType: EstimateType
  allowZeroEstimates: boolean
  extendedEstimateScale: boolean
  countUnestimatedIssues: boolean
}

export type EstimateOption = {
  value: number
  label: string
}

export const ESTIMATE_TYPE_OPTIONS: {
  value: EstimateType
  label: string
  detail: string
}[] = [
  { value: "not_in_use", label: "Not in use", detail: "" },
  {
    value: "exponential",
    label: "Exponential",
    detail: "0, 1, 2, 4, 8, 16, 32, 64 Points",
  },
  {
    value: "fibonacci",
    label: "Fibonacci",
    detail: "0, 1, 2, 3, 5, 8, 13, 21 Points",
  },
  {
    value: "linear",
    label: "Linear",
    detail: "0, 1, 2, 3, 4, 5, 6, 7 Points",
  },
  {
    value: "t_shirt",
    label: "T-Shirt",
    detail: "-, XS, S, M, L, XL, XXL, XXXL",
  },
]

const TSHIRT_OPTIONS: EstimateOption[] = [
  { value: 1, label: "XS" },
  { value: 2, label: "S" },
  { value: 3, label: "M" },
  { value: 4, label: "L" },
  { value: 5, label: "XL" },
  { value: 6, label: "XXL" },
  { value: 7, label: "XXXL" },
]

function numericScale(
  type: Exclude<EstimateType, "not_in_use" | "t_shirt">,
  extended: boolean
): number[] {
  if (type === "exponential") {
    return extended
      ? [1, 2, 4, 8, 16, 32, 64, 128]
      : [1, 2, 4, 8, 16, 32, 64]
  }
  if (type === "fibonacci") {
    return extended
      ? [1, 2, 3, 5, 8, 13, 21, 34, 55]
      : [1, 2, 3, 5, 8, 13, 21]
  }
  return extended
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16]
    : [1, 2, 3, 4, 5, 6, 7]
}

export function parseEstimateType(value: unknown): EstimateType {
  if (
    typeof value === "string" &&
    (ESTIMATE_TYPES as readonly string[]).includes(value)
  ) {
    return value as EstimateType
  }
  return "not_in_use"
}

/** Options shown in the issue estimate dropdown. `null` when estimates are off. */
export function getEstimateOptions(
  settings: TeamEstimateSettings
): EstimateOption[] | null {
  if (settings.estimateType === "not_in_use") return null

  if (settings.estimateType === "t_shirt") {
    return TSHIRT_OPTIONS
  }

  const points = numericScale(
    settings.estimateType,
    settings.extendedEstimateScale
  )
  const values = settings.allowZeroEstimates ? [0, ...points] : points
  return values.map((value) => ({
    value,
    label: String(value),
  }))
}

export function formatEstimateLabel(
  value: number | null | undefined,
  estimateType: EstimateType
): string | null {
  if (value == null) return null
  if (estimateType === "t_shirt") {
    return TSHIRT_OPTIONS.find((o) => o.value === value)?.label ?? String(value)
  }
  return String(value)
}

export function estimateTypeMenuLabel(type: EstimateType): string {
  const option = ESTIMATE_TYPE_OPTIONS.find((o) => o.value === type)
  if (!option) return "Not in use"
  return option.detail ? `${option.label} (${option.detail})` : option.label
}
