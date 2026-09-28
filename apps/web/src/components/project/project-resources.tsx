import * as React from "react"
import { Link } from "@tanstack/react-router"
import {
  IconFile,
  IconPaperclip,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"
import {
  attachFileToProject,
  linkDocumentToProject,
  unlinkDocumentFromProject,
} from "@/lib/documents"
import { useServerMutation } from "@/hooks/use-server-mutation"

export type ProjectDocumentRow = {
  id: string
  title: string
  teamId: string
  teamName: string
  teamIdentifier: string
}

export type LinkableDocumentOption = {
  id: string
  title: string
  teamId: string
  teamName: string
  teamIdentifier: string
}

type DocOption = {
  value: string
  label: string
  teamId: string
  teamLabel: string
}

const PREVIEW_LIMIT = 6

type ProjectResourcesProps = {
  projectId: string
  documents: ProjectDocumentRow[]
  linkableDocuments: LinkableDocumentOption[]
  /** Team used when attaching a new local file as a document. */
  defaultTeamId: string | null
}

export function ProjectResources({
  projectId,
  documents,
  linkableDocuments,
  defaultTeamId,
}: ProjectResourcesProps) {
  const { mutate, pending: busy } = useServerMutation()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<DocOption | null>(null)

  const options = React.useMemo<DocOption[]>(
    () =>
      linkableDocuments.map((doc) => ({
        value: doc.id,
        label: doc.title,
        teamId: doc.teamId,
        teamLabel: doc.teamIdentifier || doc.teamName,
      })),
    [linkableDocuments]
  )

  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = q
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(q) ||
            option.teamLabel.toLowerCase().includes(q)
        )
      : options
    return matched.slice(0, PREVIEW_LIMIT)
  }, [options, query])

  async function handleLink(option: DocOption | null) {
    if (!option) return
    try {
      await mutate(
        () =>
          linkDocumentToProject({
            data: {
              projectId,
              documentId: option.value,
              teamId: option.teamId,
            },
          }),
        {
          successMessage: `Linked “${option.label}”`,
          errorMessage: "Could not link document",
        }
      )
      setSelected(null)
      setQuery("")
      setOpen(false)
    } catch {
      // toast handled by useServerMutation
    }
  }

  async function handleUnlink(doc: ProjectDocumentRow) {
    try {
      await mutate(
        () =>
          unlinkDocumentFromProject({
            data: {
              projectId,
              documentId: doc.id,
              teamId: doc.teamId,
            },
          }),
        {
          successMessage: `Unlinked “${doc.title}”`,
          errorMessage: "Could not unlink document",
        }
      )
    } catch {
      // toast handled by useServerMutation
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!defaultTeamId) {
      toast.error("Join a team before attaching files to a project")
      return
    }

    try {
      const isTextLike =
        file.type.startsWith("text/") ||
        /\.(md|txt|markdown|json|csv|yml|yaml|ts|tsx|js|jsx|css|html)$/i.test(
          file.name
        )
      let content: string | undefined
      if (isTextLike && file.size <= 200_000) {
        content = await file.text()
      } else if (file.size > 200_000) {
        toast.error("File is too large (max 200KB for text attach)")
        return
      }

      await mutate(
        () =>
          attachFileToProject({
            data: {
              projectId,
              teamId: defaultTeamId,
              fileName: file.name,
              content,
            },
          }),
        {
          successMessage: `Attached “${file.name}”`,
          errorMessage: "Could not attach file",
        }
      )
      setOpen(false)
    } catch {
      // toast handled by useServerMutation
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Resources</h2>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button type="button" size="sm" variant="ghost" disabled={busy} />
            }
          >
            <IconPlus data-icon="inline-start" />
            Add document or link…
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Link existing document
                </p>
                <Combobox
                  items={options}
                  filteredItems={filteredItems}
                  value={selected}
                  onValueChange={(next) => {
                    setSelected(next)
                    if (next) void handleLink(next)
                  }}
                  onInputValueChange={(inputValue, { reason }) => {
                    if (reason === "input-change") setQuery(inputValue)
                    else setQuery("")
                  }}
                  onOpenChange={(isOpen) => {
                    if (!isOpen) setQuery("")
                  }}
                  itemToStringValue={(item) => item.label}
                  isItemEqualToValue={(a, b) => a.value === b.value}
                >
                  <ComboboxInput
                    placeholder="Search documents…"
                    disabled={busy}
                    className="w-full"
                  />
                  <ComboboxContent
                    align="start"
                    className="w-(--anchor-width) min-w-(--anchor-width)"
                  >
                    <ComboboxEmpty>No documents to link.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item.value} value={item}>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{item.label}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {item.teamLabel}
                            </span>
                          </div>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  or
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={busy || !defaultTeamId}
                onClick={() => fileInputRef.current?.click()}
              >
                {busy ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <IconPaperclip data-icon="inline-start" />
                )}
                Attach local file
              </Button>
              {!defaultTeamId ? (
                <p className="text-xs text-muted-foreground">
                  Join a team to attach files as documents.
                </p>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {documents.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className={cn(
                "group flex items-center gap-2 rounded-md border px-2.5 py-1.5"
              )}
            >
              <IconFile className="size-4 shrink-0 text-muted-foreground" />
              <Link
                to="/team/$teamId/documents/$documentId"
                params={{ teamId: doc.teamId, documentId: doc.id }}
                className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
              >
                {doc.title}
              </Link>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {doc.teamIdentifier || doc.teamName}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100"
                disabled={busy}
                onClick={() => void handleUnlink(doc)}
                aria-label={`Unlink ${doc.title}`}
              >
                <IconX className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
