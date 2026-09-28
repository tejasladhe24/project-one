/** Project period helpers (client-safe). */

function startOfLocalDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateInputValue(value: Date) {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, "0")
  const d = String(value.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Suggested period when start date has not been set: today → today + 15 days. */
export function suggestedProjectPeriod(now = new Date()) {
  const startDate = startOfLocalDay(now)
  const targetDate = new Date(startDate)
  targetDate.setDate(targetDate.getDate() + 15)
  return {
    startDate,
    targetDate,
    startInput: toDateInputValue(startDate),
    targetInput: toDateInputValue(targetDate),
  }
}

/** Period is unset until the user chooses a start date. */
export function isProjectPeriodUnset(
  startDate: Date | string | null | undefined
) {
  return startDate == null || startDate === ""
}

export function formatProjectShortDate(
  value: Date | string | null | undefined
) {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  const day = date.getDate()
  const ordinal =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th"
  const month = date.toLocaleDateString(undefined, { month: "short" })
  return `${month} ${day}${ordinal}`
}

export function toProjectDateInputValue(
  value: Date | string | null | undefined
) {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  return toDateInputValue(date)
}
