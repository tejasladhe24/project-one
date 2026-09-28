import * as React from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  IconBold,
  IconCode,
  IconHeading,
  IconItalic,
  IconLink,
  IconList,
  IconListNumbers,
  IconMarkdown,
  IconEye,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  /** Compact for short fields like team description. */
  variant?: "default" | "compact"
  className?: string
}

type Mode = "write" | "preview"

function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string = before,
  placeholder = "text"
) {
  const selected = value.slice(start, end) || placeholder
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
  const selectionStart = start + before.length
  const selectionEnd = selectionStart + selected.length
  return { next, selectionStart, selectionEnd }
}

function prefixLines(
  value: string,
  start: number,
  end: number,
  prefix: string
) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1
  const lineEnd =
    end === 0
      ? 0
      : value.indexOf("\n", end - 1) === -1
        ? value.length
        : value.indexOf("\n", end - 1)
  const block = value.slice(lineStart, lineEnd || value.length)
  const lines = block.split("\n")
  const nextBlock = lines
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n")
  const next = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd || value.length)}`
  return {
    next,
    selectionStart: lineStart,
    selectionEnd: lineStart + nextBlock.length,
  }
}

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Write markdown…",
  disabled,
  variant = "default",
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = React.useState<Mode>("preview")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const compact = variant === "compact"
  const isWrite = mode === "write"

  function applyEdit(
    edit: (
      value: string,
      start: number,
      end: number
    ) => {
      next: string
      selectionStart: number
      selectionEnd: number
    }
  ) {
    const el = textareaRef.current
    if (!el || disabled) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const { next, selectionStart, selectionEnd } = edit(value, start, end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  const tools = [
    {
      label: "Bold",
      icon: IconBold,
      run: () =>
        applyEdit((v, s, e) => wrapSelection(v, s, e, "**", "**", "bold")),
    },
    {
      label: "Italic",
      icon: IconItalic,
      run: () =>
        applyEdit((v, s, e) => wrapSelection(v, s, e, "*", "*", "italic")),
    },
    {
      label: "Heading",
      icon: IconHeading,
      run: () => applyEdit((v, s, e) => prefixLines(v, s, e, "## ")),
    },
    {
      label: "Bullet list",
      icon: IconList,
      run: () => applyEdit((v, s, e) => prefixLines(v, s, e, "- ")),
    },
    {
      label: "Numbered list",
      icon: IconListNumbers,
      run: () => applyEdit((v, s, e) => prefixLines(v, s, e, "1. ")),
    },
    {
      label: "Code",
      icon: IconCode,
      run: () =>
        applyEdit((v, s, e) => wrapSelection(v, s, e, "`", "`", "code")),
    },
    {
      label: "Link",
      icon: IconLink,
      run: () =>
        applyEdit((v, s, e) => {
          const selected = v.slice(s, e) || "link text"
          const before = "["
          const after = "](url)"
          const next = `${v.slice(0, s)}${before}${selected}${after}${v.slice(e)}`
          return {
            next,
            selectionStart: s + before.length + selected.length + 2,
            selectionEnd: s + before.length + selected.length + 5,
          }
        }),
    },
  ]

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
          {isWrite
            ? tools.map((tool) => (
                <Button
                  key={tool.label}
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={tool.run}
                  aria-label={tool.label}
                  title={tool.label}
                >
                  <tool.icon />
                </Button>
              ))
            : null}
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => setMode(isWrite ? "preview" : "write")}
          className="ml-auto h-7 shrink-0 px-2 text-xs"
          aria-pressed={isWrite}
          aria-label={isWrite ? "Switch to preview" : "Switch to write"}
          title={isWrite ? "Preview" : "Write"}
        >
          {isWrite ? (
            <>
              <IconEye data-icon="inline-start" />
              Preview
            </>
          ) : (
            <>
              <IconMarkdown data-icon="inline-start" />
              Write
            </>
          )}
        </Button>
      </div>

      {isWrite ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "resize-y rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent",
            compact ? "min-h-28" : "min-h-[420px]",
            "font-mono text-sm leading-relaxed"
          )}
        />
      ) : (
        <div
          className={cn(
            "overflow-auto px-4 py-3",
            compact ? "min-h-28" : "min-h-[420px]"
          )}
          onBlur={onBlur}
        >
          {value.trim() ? (
            <div className="markdown-body text-sm leading-relaxed">
              <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  )
}
