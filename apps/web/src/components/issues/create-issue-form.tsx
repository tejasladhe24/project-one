import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { IconBox, IconCheck, IconUsersGroup } from "@tabler/icons-react"
import { z } from "zod"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@workspace/ui/components/command"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import { MarkdownEditor } from "@/components/markdown-editor"
import { PriorityIcon } from "@/components/issue/priority-icon"
import { MetaMenu, MetaPillTrigger } from "@/components/issue/meta-menu"
import { createIssue } from "@/lib/issues"
import {
  deleteIssueDraft,
  saveIssueDraft,
  type IssueDraftPriority,
  type IssueDraftValues,
} from "@/lib/issues/drafts"
import { PRIORITIES, priorityLabel } from "@/lib/shared/priority"
import { toast } from "sonner"

const createIssueSchema = z.object({
  title: z.string().min(2, "Title is required"),
  teamId: z.string().min(1, "Team is required"),
  projectId: z.string(),
  priority: z.enum(["0", "1", "2", "3", "4"]),
  description: z.string(),
})

export type CreateIssueProjectOption = {
  id: string
  name: string
}

export type CreateIssueTeamOption = {
  id: string
  name: string
  identifier: string | null
}

export type CreateIssueFormValues = IssueDraftValues

export type CreateIssueFormHandle = {
  /** Persist current values as a draft when there is something to keep. */
  saveDraftIfNeeded: (options?: { silent?: boolean }) => Promise<string | null>
}

type CreateIssueFormProps = {
  projects: CreateIssueProjectOption[]
  teams: CreateIssueTeamOption[]
  teamId?: string
  organizationId: string
  draftId?: string
  initialValues?: Partial<CreateIssueFormValues>
  onCreated?: () => void
  onDraftSaved?: (draftId: string) => void
  ref?: React.Ref<CreateIssueFormHandle>
}

function hasDraftWorthyContent(values: IssueDraftValues) {
  return (
    values.title.trim().length > 0 ||
    values.description.trim().length > 0 ||
    (values.projectId !== "" && values.projectId !== "__none__") ||
    values.priority !== "0"
  )
}

function Check({ show }: { show: boolean }) {
  return show ? <IconCheck className="size-4 shrink-0" /> : null
}

export function CreateIssueForm({
  projects,
  teams,
  teamId,
  organizationId,
  draftId: draftIdProp,
  initialValues,
  onCreated,
  onDraftSaved,
  ref,
}: CreateIssueFormProps) {
  const [formError, setFormError] = React.useState<string | null>(null)
  const [draftId, setDraftId] = React.useState<string | undefined>(draftIdProp)
  const [isSavingDraft, setIsSavingDraft] = React.useState(false)
  const [teamOpen, setTeamOpen] = React.useState(false)
  const [projectOpen, setProjectOpen] = React.useState(false)
  const [priorityOpen, setPriorityOpen] = React.useState(false)
  const draftIdRef = React.useRef(draftId)

  React.useEffect(() => {
    setDraftId(draftIdProp)
  }, [draftIdProp])

  React.useEffect(() => {
    draftIdRef.current = draftId
  }, [draftId])

  const form = useForm({
    defaultValues: {
      title: initialValues?.title ?? "",
      teamId: initialValues?.teamId ?? teamId ?? teams[0]?.id ?? "",
      projectId: initialValues?.projectId ?? "__none__",
      priority: (initialValues?.priority ?? "0") as IssueDraftPriority,
      description: initialValues?.description ?? "",
    },
    validators: {
      onSubmit: createIssueSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null)
      try {
        await createIssue({
          data: {
            title: value.title.trim(),
            teamId: value.teamId,
            projectId:
              value.projectId && value.projectId !== "__none__"
                ? value.projectId
                : undefined,
            priority: Number(value.priority),
            description: value.description.trim() || undefined,
          },
        })
        const currentDraftId = draftIdRef.current
        if (currentDraftId) {
          deleteIssueDraft(organizationId, currentDraftId)
          setDraftId(undefined)
        }
        form.reset()
        onCreated?.()
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not create issue"
        )
      }
    },
  })

  const persistDraft = React.useCallback(
    async (options?: { silent?: boolean }) => {
      const values = form.state.values
      const currentDraftId = draftIdRef.current

      if (!currentDraftId && !hasDraftWorthyContent(values)) {
        return null
      }

      setFormError(null)
      if (!options?.silent) setIsSavingDraft(true)
      try {
        const saved = saveIssueDraft({
          organizationId,
          draftId: currentDraftId,
          values: {
            title: values.title,
            teamId: values.teamId,
            projectId: values.projectId,
            priority: values.priority,
            description: values.description,
          },
        })
        setDraftId(saved.id)
        draftIdRef.current = saved.id
        onDraftSaved?.(saved.id)
        if (!options?.silent) toast.success("Draft saved")
        return saved.id
      } catch (error) {
        if (!options?.silent) {
          setFormError(
            error instanceof Error ? error.message : "Could not save draft"
          )
        }
        return null
      } finally {
        if (!options?.silent) setIsSavingDraft(false)
      }
    },
    [form, organizationId, onDraftSaved]
  )

  React.useImperativeHandle(
    ref,
    () => ({
      saveDraftIfNeeded: (options) => persistDraft(options),
    }),
    [persistDraft]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <form
        id="create-issue-form"
        className="flex min-h-0 flex-1 flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <FieldGroup className="min-h-0 flex-1 gap-3">
          <form.Field name="title">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field
                  data-invalid={isInvalid || undefined}
                  className="gap-1.5"
                >
                  <FieldLabel htmlFor={field.name} className="sr-only">
                    Title
                  </FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Issue title"
                    className="h-auto border-0 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 md:text-2xl"
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <Field className="min-h-0 flex-1 gap-1.5">
                <FieldLabel
                  htmlFor="create-issue-description"
                  className="sr-only"
                >
                  Description
                </FieldLabel>
                <MarkdownEditor
                  value={field.state.value}
                  onChange={(next) => field.handleChange(next)}
                  onBlur={field.handleBlur}
                  placeholder="Add description…"
                  defaultMode="write"
                  className="min-h-[280px] flex-1 shadow-none sm:min-h-[360px]"
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </form>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <form.Subscribe
        selector={(s) =>
          [
            s.isSubmitting,
            s.values.teamId,
            s.values.projectId,
            s.values.priority,
          ] as const
        }
      >
        {([
          isSubmitting,
          selectedTeamId,
          selectedProjectId,
          selectedPriority,
        ]) => {
          const selectedTeam = teams.find((t) => t.id === selectedTeamId)
          const selectedProject =
            selectedProjectId && selectedProjectId !== "__none__"
              ? projects.find((p) => p.id === selectedProjectId)
              : undefined
          const priorityValue = Number(selectedPriority) as 0 | 1 | 2 | 3 | 4

          return (
            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {!teamId ? (
                  <MetaMenu
                    open={teamOpen}
                    onOpenChange={setTeamOpen}
                    placeholder="Select team…"
                    trigger={
                      <MetaPillTrigger
                        disabled={isSubmitting || isSavingDraft}
                        className={cn(!selectedTeam && "text-muted-foreground")}
                      >
                        <IconUsersGroup className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {selectedTeam
                            ? (selectedTeam.identifier ?? selectedTeam.name)
                            : "Team"}
                        </span>
                      </MetaPillTrigger>
                    }
                  >
                    <CommandEmpty>No teams found.</CommandEmpty>
                    <CommandGroup>
                      {teams.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={
                            t.identifier ? `${t.name} ${t.identifier}` : t.name
                          }
                          onSelect={() => {
                            form.setFieldValue("teamId", t.id)
                            setTeamOpen(false)
                          }}
                          className="gap-2"
                        >
                          <IconUsersGroup className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">
                            {t.identifier
                              ? `${t.name} (${t.identifier})`
                              : t.name}
                          </span>
                          <Check show={selectedTeamId === t.id} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </MetaMenu>
                ) : null}

                <MetaMenu
                  open={priorityOpen}
                  onOpenChange={setPriorityOpen}
                  placeholder="Change priority…"
                  trigger={
                    <MetaPillTrigger disabled={isSubmitting || isSavingDraft}>
                      <PriorityIcon priority={priorityValue} />
                      <span className="truncate">
                        {priorityLabel(priorityValue)}
                      </span>
                    </MetaPillTrigger>
                  }
                >
                  <CommandEmpty>No priority found.</CommandEmpty>
                  <CommandGroup>
                    {PRIORITIES.map((p) => (
                      <CommandItem
                        key={p.value}
                        value={p.label}
                        onSelect={() => {
                          form.setFieldValue(
                            "priority",
                            String(p.value) as IssueDraftPriority
                          )
                          setPriorityOpen(false)
                        }}
                        className="gap-2"
                      >
                        <PriorityIcon priority={p.value} />
                        <span className="min-w-0 flex-1 truncate">
                          {p.label}
                        </span>
                        <Check show={priorityValue === p.value} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </MetaMenu>

                <MetaMenu
                  open={projectOpen}
                  onOpenChange={setProjectOpen}
                  placeholder="Change project…"
                  trigger={
                    <MetaPillTrigger disabled={isSubmitting || isSavingDraft}>
                      <IconBox className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {selectedProject?.name ?? "Project"}
                      </span>
                    </MetaPillTrigger>
                  }
                >
                  <CommandEmpty>No projects found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="No project"
                      onSelect={() => {
                        form.setFieldValue("projectId", "__none__")
                        setProjectOpen(false)
                      }}
                      className="gap-2"
                    >
                      <IconBox className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        No project
                      </span>
                      <Check
                        show={
                          !selectedProjectId || selectedProjectId === "__none__"
                        }
                      />
                    </CommandItem>
                    {projects.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.name}
                        onSelect={() => {
                          form.setFieldValue("projectId", p.id)
                          setProjectOpen(false)
                        }}
                        className="gap-2"
                      >
                        <IconBox className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">
                          {p.name}
                        </span>
                        <Check show={selectedProjectId === p.id} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </MetaMenu>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting || isSavingDraft}
                  onClick={() => {
                    void persistDraft()
                  }}
                >
                  {isSavingDraft ? <Spinner data-icon="inline-start" /> : null}
                  Save draft
                </Button>
                <Button
                  type="submit"
                  form="create-issue-form"
                  disabled={isSubmitting || isSavingDraft}
                >
                  {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                  Create issue
                </Button>
              </div>
            </div>
          )
        }}
      </form.Subscribe>
    </div>
  )
}
