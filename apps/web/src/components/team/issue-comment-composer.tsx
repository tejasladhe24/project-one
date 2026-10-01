import * as React from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatIssueMention,
  formatUserMention,
  listCommentMentionOptions,
} from "@/lib/issues/comments"
import { listProjectCommentMentionOptions } from "@/lib/projects/comments"
import { getInitials } from "@/lib/shared/string"
import { statusDotClass } from "@/lib/statuses/display"
import { usePreferences } from "@/hooks/use-preferences"

type MentionUser = {
  userId: string
  name: string
  email: string
  image: string | null
}

type MentionIssue = {
  id: string
  number: number
  title: string
  statusName: string | null
  statusCategory: string | null
  teamIdentifier: string | null
  label: string
}

type IssueCommentComposerProps = {
  /** Team-scoped mentions (issue activity). */
  teamId?: string
  /** Project-scoped mentions (project activity). Exactly one of teamId/projectId. */
  projectId?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
  className?: string
}

const MENTION_CHIP_CLASS =
  "mention-chip mx-0.5 inline-flex items-baseline rounded bg-muted px-1 py-0.5 align-baseline text-sm font-medium text-foreground"

function issueKey(issue: MentionIssue) {
  const prefix = issue.teamIdentifier?.trim() || "ISS"
  return `${prefix}-${String(issue.number).padStart(4, "0")}`
}

function createMentionChip(type: "user" | "issue", id: string, label: string) {
  const chip = document.createElement("span")
  chip.contentEditable = "false"
  chip.dataset.mentionType = type
  chip.dataset.mentionId = id
  chip.dataset.mentionLabel = label
  chip.className = MENTION_CHIP_CLASS
  chip.textContent = type === "user" ? `@${label}` : label
  return chip
}

/** Serialize editor DOM → stored body with `@[label](type:id)` tokens. */
function serializeEditor(root: HTMLElement): string {
  let out = ""

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? ""
      return
    }
    if (!(node instanceof HTMLElement)) return

    if (node.dataset.mentionType && node.dataset.mentionId) {
      const type = node.dataset.mentionType as "user" | "issue"
      const id = node.dataset.mentionId
      const label =
        node.dataset.mentionLabel ?? (node.textContent ?? "").replace(/^@/, "")
      out +=
        type === "user"
          ? formatUserMention(label, id)
          : formatIssueMention(label, id)
      return
    }

    if (node.tagName === "BR") {
      out += "\n"
      return
    }

    if (node.tagName === "DIV" || node.tagName === "P") {
      if (out.length > 0 && !out.endsWith("\n")) out += "\n"
    }

    for (const child of Array.from(node.childNodes)) {
      walk(child)
    }
  }

  walk(root)
  return out.replace(/\u00a0/g, " ").trimEnd()
}

function getTextBeforeCaret(root: HTMLElement): string | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer)) return null

  const pre = range.cloneRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString()
}

function deleteAtTrigger(
  root: HTMLElement,
  savedRange?: Range | null
): boolean {
  const selection = window.getSelection()
  if (!selection) return false

  if (savedRange) {
    selection.removeAllRanges()
    selection.addRange(savedRange.cloneRange())
  }

  if (selection.rangeCount === 0) return false
  const range = selection.getRangeAt(0)
  if (!range.collapsed) return false
  if (!root.contains(range.startContainer)) return false

  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return false
  const text = node.textContent ?? ""
  const offset = range.startOffset
  const before = text.slice(0, offset)
  const match = before.match(/(^|[\s([{])@([^\s@]*)$/)
  if (!match) return false

  const atIndex = before.lastIndexOf("@")
  const next = text.slice(0, atIndex) + text.slice(offset)
  node.textContent = next

  const nextRange = document.createRange()
  nextRange.setStart(node, atIndex)
  nextRange.collapse(true)
  selection.removeAllRanges()
  selection.addRange(nextRange)
  root.focus()
  return true
}

function placeCaretAfter(node: Node) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.setStartAfter(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function insertNodesAtCaret(nodes: Node[]) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  let last: Node | null = null
  for (const node of nodes) {
    range.insertNode(node)
    range.setStartAfter(node)
    range.collapse(true)
    last = node
  }
  selection.removeAllRanges()
  selection.addRange(range)
  if (last) placeCaretAfter(last)
}

type MentionState = {
  open: boolean
}

export function IssueCommentComposer({
  teamId,
  projectId,
  placeholder = "Leave a comment… Use @ to mention",
  disabled,
  autoFocus,
  onSubmit,
  onCancel,
  className,
}: IssueCommentComposerProps) {
  const { preferences } = usePreferences()
  const submitOnEnter = preferences.commentSubmitKey === "enter"
  const [hasContent, setHasContent] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [mention, setMention] = React.useState<MentionState | null>(null)
  const [search, setSearch] = React.useState("")
  const [users, setUsers] = React.useState<MentionUser[]>([])
  const [issues, setIssues] = React.useState<MentionIssue[]>([])
  const [loadingMentions, setLoadingMentions] = React.useState(false)
  const editorRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const triggerRangeRef = React.useRef<Range | null>(null)

  React.useEffect(() => {
    if (autoFocus) editorRef.current?.focus()
  }, [autoFocus])

  React.useEffect(() => {
    if (!mention) {
      setUsers([])
      setIssues([])
      setSearch("")
      return
    }

    let cancelled = false
    const handle = window.setTimeout(() => {
      setLoadingMentions(true)
      const request = projectId
        ? listProjectCommentMentionOptions({
            data: { projectId, query: search },
          })
        : listCommentMentionOptions({
            data: { teamId: teamId!, query: search },
          })
      void request
        .then((res) => {
          if (cancelled) return
          setUsers(res.users)
          setIssues(res.issues)
        })
        .catch(() => {
          if (cancelled) return
          setUsers([])
          setIssues([])
        })
        .finally(() => {
          if (!cancelled) setLoadingMentions(false)
        })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [mention, search, teamId, projectId])

  React.useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!mention) return
      const target = event.target as Node
      if (
        menuRef.current?.contains(target) ||
        editorRef.current?.contains(target)
      ) {
        return
      }
      setMention(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [mention])

  function syncHasContent() {
    const el = editorRef.current
    if (!el) return
    const text = el.innerText.replace(/\u00a0/g, " ").trim()
    const hasChip = Boolean(el.querySelector("[data-mention-type]"))
    setHasContent(text.length > 0 || hasChip)
  }

  function detectMention() {
    const el = editorRef.current
    if (!el) return
    const before = getTextBeforeCaret(el)
    if (before == null) return
    const match = before.match(/(^|[\s([{])@([^\s@]*)$/)
    if (!match) {
      setMention(null)
      triggerRangeRef.current = null
      return
    }
    const queryFromAt = match[2] ?? ""
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      triggerRangeRef.current = selection.getRangeAt(0).cloneRange()
    }
    if (!mention) {
      setMention({ open: true })
      setSearch(queryFromAt)
    }
  }

  function insertMention(type: "user" | "issue", id: string, label: string) {
    const el = editorRef.current
    if (!el) return
    el.focus()
    deleteAtTrigger(el, triggerRangeRef.current)

    const chip = createMentionChip(type, id, label)
    const space = document.createTextNode("\u00a0")
    insertNodesAtCaret([chip, space])

    triggerRangeRef.current = null
    setMention(null)
    setSearch("")
    syncHasContent()
  }

  function clearEditor() {
    const el = editorRef.current
    if (!el) return
    el.innerHTML = ""
    setHasContent(false)
  }

  async function handleSubmit() {
    const el = editorRef.current
    if (!el || submitting || disabled) return
    const body = serializeEditor(el).trim()
    if (!body) return
    setSubmitting(true)
    try {
      await onSubmit(body)
      clearEditor()
      setMention(null)
      setSearch("")
    } finally {
      setSubmitting(false)
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && mention) {
      event.preventDefault()
      setMention(null)
      triggerRangeRef.current = null
      return
    }

    const isModEnter = (event.metaKey || event.ctrlKey) && event.key === "Enter"
    const isPlainEnter =
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey

    if (submitOnEnter ? isPlainEnter || isModEnter : isModEnter) {
      event.preventDefault()
      void handleSubmit()
      return
    }

    // Soft line break: Shift+Enter always; plain Enter when submit is ⌘↵.
    if (
      event.key === "Enter" &&
      (event.shiftKey || (!submitOnEnter && isPlainEnter))
    ) {
      event.preventDefault()
      document.execCommand("insertLineBreak")
      syncHasContent()
    }
  }

  return (
    <div className={cn("relative", className)}>
      {mention ? (
        <div
          ref={menuRef}
          className="absolute bottom-full left-0 z-50 mb-2 w-[min(100%,22rem)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md"
        >
          <Command shouldFilter={false} className="rounded-none border-0">
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search users or tickets…"
              autoFocus
            />
            <CommandList className="max-h-72">
              {loadingMentions && users.length === 0 && issues.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Searching…
                </div>
              ) : (
                <>
                  <CommandEmpty>No matches.</CommandEmpty>
                  {users.length > 0 ? (
                    <CommandGroup heading="Users">
                      {users.map((u) => (
                        <CommandItem
                          key={u.userId}
                          value={`user-${u.userId}`}
                          onSelect={() =>
                            insertMention("user", u.userId, u.name)
                          }
                          className="gap-2"
                        >
                          <Avatar className="size-5">
                            {u.image ? (
                              <AvatarImage src={u.image} alt={u.name} />
                            ) : null}
                            <AvatarFallback className="text-[9px]">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{u.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                  {issues.length > 0 ? (
                    <CommandGroup heading="Issues">
                      {issues.map((i) => (
                        <CommandItem
                          key={i.id}
                          value={`issue-${i.id}`}
                          onSelect={() =>
                            insertMention("issue", i.id, issueKey(i))
                          }
                          className="gap-2"
                        >
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              statusDotClass(i.statusCategory)
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 truncate">
                            <span className="font-medium">{issueKey(i)}</span>{" "}
                            <span className="text-muted-foreground">
                              {i.title}
                            </span>
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                </>
              )}
            </CommandList>
          </Command>
        </div>
      ) : null}

      <div className="relative">
        {!hasContent ? (
          <div
            className="pointer-events-none absolute inset-0 px-2.5 py-2 text-base text-muted-foreground md:text-sm"
            aria-hidden
          >
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label="Comment"
          contentEditable={!disabled && !submitting}
          suppressContentEditableWarning
          onInput={() => {
            syncHasContent()
            detectMention()
          }}
          onKeyUp={() => detectMention()}
          onClick={() => detectMention()}
          onKeyDown={onKeyDown}
          data-slot="comment-editor"
          className={cn(
            "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base whitespace-pre-wrap transition-colors outline-none md:text-sm dark:bg-input/30",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            (disabled || submitting) &&
              "cursor-not-allowed opacity-50 dark:bg-input/80"
          )}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          @ to mention · {submitOnEnter ? "Enter" : "⌘↵"} to send
        </p>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={submitting}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={submitting || disabled || !hasContent}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Posting…" : "Comment"}
          </Button>
        </div>
      </div>
    </div>
  )
}
