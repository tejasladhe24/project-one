export const PREFERENCES_STORAGE_KEY = "preferences:v1"

export const HOME_VIEW_OPTIONS = [
  {
    value: "issues",
    label: "My Issues",
    description: "Your assigned and created issues",
    path: "/issues",
  },
  {
    value: "inbox",
    label: "Inbox",
    description: "Notifications and updates",
    path: "/inbox",
  },
  {
    value: "projects",
    label: "Projects",
    description: "Workspace projects list",
    path: "/projects",
  },
] as const

export type HomeView = (typeof HOME_VIEW_OPTIONS)[number]["value"]

export const DISPLAY_NAME_OPTIONS = [
  { value: "full", label: "Full name" },
  { value: "first", label: "First name" },
  { value: "username", label: "Username" },
] as const

export type DisplayNameFormat = (typeof DISPLAY_NAME_OPTIONS)[number]["value"]

export const FIRST_DAY_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "sunday", label: "Sunday" },
] as const

export type FirstDayOfWeek = (typeof FIRST_DAY_OPTIONS)[number]["value"]

export const COMMENT_SUBMIT_OPTIONS = [
  { value: "enter", label: "Enter" },
  { value: "cmd-enter", label: "⌘ Enter" },
] as const

export type CommentSubmitKey = (typeof COMMENT_SUBMIT_OPTIONS)[number]["value"]

export type UserPreferences = {
  defaultHomeView: HomeView
  displayNames: DisplayNameFormat
  firstDayOfWeek: FirstDayOfWeek
  commentSubmitKey: CommentSubmitKey
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultHomeView: "issues",
  displayNames: "full",
  firstDayOfWeek: "monday",
  commentSubmitKey: "enter",
}

function isHomeView(value: unknown): value is HomeView {
  return HOME_VIEW_OPTIONS.some((option) => option.value === value)
}

function isDisplayNameFormat(value: unknown): value is DisplayNameFormat {
  return DISPLAY_NAME_OPTIONS.some((option) => option.value === value)
}

function isFirstDayOfWeek(value: unknown): value is FirstDayOfWeek {
  return FIRST_DAY_OPTIONS.some((option) => option.value === value)
}

function isCommentSubmitKey(value: unknown): value is CommentSubmitKey {
  return COMMENT_SUBMIT_OPTIONS.some((option) => option.value === value)
}

export function parsePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PREFERENCES }
  }

  const data = raw as Record<string, unknown>

  return {
    defaultHomeView: isHomeView(data.defaultHomeView)
      ? data.defaultHomeView
      : DEFAULT_PREFERENCES.defaultHomeView,
    displayNames: isDisplayNameFormat(data.displayNames)
      ? data.displayNames
      : DEFAULT_PREFERENCES.displayNames,
    firstDayOfWeek: isFirstDayOfWeek(data.firstDayOfWeek)
      ? data.firstDayOfWeek
      : DEFAULT_PREFERENCES.firstDayOfWeek,
    commentSubmitKey: isCommentSubmitKey(data.commentSubmitKey)
      ? data.commentSubmitKey
      : DEFAULT_PREFERENCES.commentSubmitKey,
  }
}

export function readPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PREFERENCES }
  }

  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!stored) return { ...DEFAULT_PREFERENCES }
    return parsePreferences(JSON.parse(stored) as unknown)
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function writePreferences(preferences: UserPreferences) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    )
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function homeViewPath(
  view: HomeView
): "/issues" | "/inbox" | "/projects" {
  const match = HOME_VIEW_OPTIONS.find((option) => option.value === view)
  return (match?.path ?? "/issues") as "/issues" | "/inbox" | "/projects"
}

export function homeViewLabel(view: HomeView) {
  return (
    HOME_VIEW_OPTIONS.find((option) => option.value === view)?.label ??
    "My Issues"
  )
}

export function formatDisplayName(
  name: string,
  format: DisplayNameFormat = DEFAULT_PREFERENCES.displayNames
) {
  const trimmed = name.trim()
  if (!trimmed) return name

  if (format === "full") return trimmed

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (format === "first") {
    return parts[0] ?? trimmed
  }

  // Username: first token lowercased, spaces removed.
  return parts.join("").toLowerCase()
}

export function parseSelectString(value: unknown): string | null {
  if (typeof value === "string") return value
  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof (value as { value: unknown }).value === "string"
  ) {
    return (value as { value: string }).value
  }
  return null
}
