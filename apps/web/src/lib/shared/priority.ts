export const PRIORITIES = [
  { value: 0, label: "No priority" },
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
] as const

export type PriorityValue = (typeof PRIORITIES)[number]["value"]

export function priorityLabel(priority: number | null | undefined) {
  return (
    PRIORITIES.find((p) => p.value === (priority ?? 0))?.label ?? "No priority"
  )
}
