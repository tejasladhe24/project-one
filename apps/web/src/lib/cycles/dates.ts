/** Weekday matching `Date#getDay()`: 0=Sunday … 6=Saturday. */
export const CYCLE_START_DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
] as const

export const CYCLE_DURATION_WEEKS = [1, 2, 3, 4] as const

export type TeamCycleSettings = {
  cyclesEnabled: boolean
  cycleDurationWeeks: number
  cycleStartDay: number
  cyclesOrigin: Date | string | null
}

function startOfLocalDay(value: Date) {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Most recent `startDay` on or before `date`. */
export function startOfCycleWeek(date: Date, startDay: number) {
  const d = startOfLocalDay(date)
  const day = d.getDay()
  const diff = (day - startDay + 7) % 7
  d.setDate(d.getDate() - diff)
  return d
}

export function parseCyclesOrigin(
  value: Date | string | null | undefined
): Date | null {
  if (value == null) return null
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return startOfLocalDay(date)
}

export function resolveCyclesOrigin(
  settings: Pick<TeamCycleSettings, "cyclesOrigin" | "cycleStartDay">,
  now = new Date()
) {
  return (
    parseCyclesOrigin(settings.cyclesOrigin) ??
    startOfCycleWeek(now, settings.cycleStartDay)
  )
}

export function getCurrentCycleNumber(
  settings: TeamCycleSettings,
  now = new Date()
) {
  if (!settings.cyclesEnabled) return null
  const origin = resolveCyclesOrigin(settings, now)
  const weeks = Math.max(1, settings.cycleDurationWeeks)
  const msPerCycle = weeks * 7 * 24 * 60 * 60 * 1000
  const diff = startOfLocalDay(now).getTime() - origin.getTime()
  if (diff < 0) return 1
  return Math.floor(diff / msPerCycle) + 1
}

export function getCycleDateRange(
  settings: TeamCycleSettings,
  cycleNumber: number,
  now = new Date()
) {
  const origin = resolveCyclesOrigin(settings, now)
  const weeks = Math.max(1, settings.cycleDurationWeeks)
  const start = new Date(origin)
  start.setDate(start.getDate() + (cycleNumber - 1) * weeks * 7)
  const endExclusive = new Date(start)
  endExclusive.setDate(endExclusive.getDate() + weeks * 7)
  const endInclusive = new Date(endExclusive)
  endInclusive.setDate(endInclusive.getDate() - 1)
  return { start, endExclusive, endInclusive }
}

export function formatCycleShortDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function formatCycleRangeLabel(
  settings: TeamCycleSettings,
  cycleNumber: number,
  now = new Date()
) {
  const { start, endInclusive } = getCycleDateRange(settings, cycleNumber, now)
  return `${formatCycleShortDate(start)} – ${formatCycleShortDate(endInclusive)}`
}

export function cycleStartDayLabel(day: number) {
  return CYCLE_START_DAYS.find((d) => d.value === day)?.label ?? "Monday"
}

export function cycleDurationLabel(weeks: number) {
  return weeks === 1 ? "1 week" : `${weeks} weeks`
}
