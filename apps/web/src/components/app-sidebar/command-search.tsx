import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { IconBox, IconFileChart, IconLoader2 } from "@tabler/icons-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command"
import { UserAvatar } from "@/components/shared/user-avatar"
import { formatIssueKey } from "@/lib/issues/meta"
import { getCommandSearchData, type CommandSearchData } from "@/lib/search"

const EMPTY_DATA: CommandSearchData = {
  issues: [],
  projects: [],
  members: [],
}

type CommandSearchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const navigate = useNavigate()
  const [data, setData] = React.useState<CommandSearchData>(EMPTY_DATA)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const hasLoadedRef = React.useRef(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return
      if (!(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      onOpenChange(!open)
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    if (!hasLoadedRef.current) setLoading(true)
    setError(null)

    void getCommandSearchData()
      .then((result) => {
        if (cancelled) return
        setData(result)
        hasLoadedRef.current = true
      })
      .catch(() => {
        if (cancelled) return
        setError("Failed to load search results.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  function runAndClose(action: () => void) {
    onOpenChange(false)
    action()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search issues, projects, and members"
      className="sm:max-w-lg"
    >
      <Command>
        <CommandInput placeholder="Search issues, projects, members…" />
        <CommandList>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {error}
            </div>
          ) : data.issues.length === 0 &&
            data.projects.length === 0 &&
            data.members.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nothing to search yet.
            </div>
          ) : (
            <>
              <CommandEmpty>No results found.</CommandEmpty>

              {data.issues.length > 0 ? (
                <CommandGroup heading="Issues">
                  {data.issues.map((item) => {
                    const key = formatIssueKey(item.teamIdentifier, item.number)
                    return (
                      <CommandItem
                        key={item.id}
                        value={`${key} ${item.title}`}
                        onSelect={() =>
                          runAndClose(() => {
                            void navigate({
                              to: "/issue/$issueId",
                              params: { issueId: item.id },
                            })
                          })
                        }
                      >
                        <IconBox />
                        <span className="truncate">
                          <span className="text-muted-foreground">{key}</span>
                          {" · "}
                          {item.title}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : null}

              {data.issues.length > 0 && data.projects.length > 0 ? (
                <CommandSeparator />
              ) : null}

              {data.projects.length > 0 ? (
                <CommandGroup heading="Projects">
                  {data.projects.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`project ${item.name}`}
                      onSelect={() =>
                        runAndClose(() => {
                          void navigate({
                            to: "/project/$id",
                            params: { id: item.id },
                          })
                        })
                      }
                    >
                      <IconFileChart />
                      <span className="truncate">{item.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {(data.issues.length > 0 || data.projects.length > 0) &&
              data.members.length > 0 ? (
                <CommandSeparator />
              ) : null}

              {data.members.length > 0 ? (
                <CommandGroup heading="Members">
                  {data.members.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`member ${item.name} ${item.email}`}
                      onSelect={() =>
                        runAndClose(() => {
                          void navigate({ to: "/members" })
                        })
                      }
                    >
                      <UserAvatar
                        name={item.name}
                        image={item.image}
                        email={item.email}
                        className="size-4"
                      />
                      <span className="truncate">
                        {item.name || item.email}
                        {item.name ? (
                          <span className="text-muted-foreground">
                            {" · "}
                            {item.email}
                          </span>
                        ) : null}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

export function useCommandSearchShortcutLabel() {
  const [isMac, setIsMac] = React.useState(true)

  React.useEffect(() => {
    setIsMac(
      /Mac|iPhone|iPod|iPad/.test(navigator.platform) ||
        navigator.userAgent.includes("Mac")
    )
  }, [])

  return isMac ? "⌘K" : "Ctrl+K"
}
