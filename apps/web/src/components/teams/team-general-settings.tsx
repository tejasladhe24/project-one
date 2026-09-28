import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { z } from "zod"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { useServerMutation } from "@/hooks/use-server-mutation"
import {
  ESTIMATE_TYPE_OPTIONS,
  ESTIMATE_TYPES,
  estimateTypeMenuLabel,
  type EstimateType,
} from "@/lib/estimates"
import { updateTeamEstimateSettings, updateTeamSettings } from "@/lib/teams"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  identifier: z
    .string()
    .min(1, "Identifier is required")
    .max(4, "Max 4 characters")
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
  description: z.string().max(500),
})

type TeamGeneralSettingsProps = {
  teamId: string
  name: string
  identifier: string
  description: string | null
  estimateType: EstimateType
  allowZeroEstimates: boolean
  extendedEstimateScale: boolean
  countUnestimatedIssues: boolean
}

export function TeamGeneralSettings({
  teamId,
  name,
  identifier,
  description,
  estimateType,
  allowZeroEstimates,
  extendedEstimateScale,
  countUnestimatedIssues,
}: TeamGeneralSettingsProps) {
  const { mutate } = useServerMutation()
  const { mutate: mutateEstimates, pending: estimateBusy } = useServerMutation()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)
  const [estimateError, setEstimateError] = React.useState<string | null>(null)
  const [estimate, setEstimate] = React.useState({
    estimateType,
    allowZeroEstimates,
    extendedEstimateScale,
    countUnestimatedIssues,
  })

  React.useEffect(() => {
    setEstimate({
      estimateType,
      allowZeroEstimates,
      extendedEstimateScale,
      countUnestimatedIssues,
    })
  }, [
    estimateType,
    allowZeroEstimates,
    extendedEstimateScale,
    countUnestimatedIssues,
  ])

  const form = useForm({
    defaultValues: {
      name,
      identifier,
      description: description ?? "",
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      setSaved(false)
      try {
        await mutate(
          () =>
            updateTeamSettings({
              data: {
                teamId,
                name: value.name.trim(),
                identifier: value.identifier.trim().toUpperCase(),
                description: value.description.trim() || null,
              },
            }),
          { errorMessage: "Could not save settings" }
        )
        setSaved(true)
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not save settings"
        )
      }
    },
  })

  async function saveEstimates(
    next: Partial<typeof estimate> & { estimateType?: EstimateType }
  ) {
    const payload = { ...estimate, ...next }
    setEstimate(payload)
    setEstimateError(null)
    try {
      await mutateEstimates(
        () =>
          updateTeamEstimateSettings({
            data: { teamId, ...payload },
          }),
        { errorMessage: "Could not save estimate settings" }
      )
    } catch (error) {
      setEstimate({
        estimateType,
        allowZeroEstimates,
        extendedEstimateScale,
        countUnestimatedIssues,
      })
      setEstimateError(
        error instanceof Error
          ? error.message
          : "Could not save estimate settings"
      )
    }
  }

  const estimatesEnabled = estimate.estimateType !== "not_in_use"
  const isTShirt = estimate.estimateType === "t_shirt"

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-6 lg:px-6">
      <div>
        <Link
          to="/team/$teamId/settings"
          params={{ teamId }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">General</h1>
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field name="name">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="identifier">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>Identifier</FieldLabel>
                  <p className="mb-1.5 text-xs text-muted-foreground">
                    Used in issue IDs
                  </p>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(e.target.value.toUpperCase())
                    }
                    maxLength={4}
                    className="max-w-32 uppercase"
                    aria-invalid={isInvalid}
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
              <Field>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  A short summary shown on the team page
                </p>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Builds and maintains core platform infrastructure"
                  rows={3}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        {saved ? <p className="text-sm text-muted-foreground">Saved</p> : null}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" className="w-fit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Estimates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Used to estimate issue complexity and plan cycle capacity.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Issue estimation</p>
            </div>
            <Select
              value={estimate.estimateType}
              disabled={estimateBusy}
              onValueChange={(value) => {
                if (value == null) return
                const next =
                  typeof value === "string"
                    ? value
                    : typeof value === "object" &&
                        value !== null &&
                        "value" in value &&
                        typeof (value as { value: unknown }).value === "string"
                      ? (value as { value: string }).value
                      : null
                if (
                  next == null ||
                  !(ESTIMATE_TYPES as readonly string[]).includes(next)
                ) {
                  return
                }
                void saveEstimates({ estimateType: next as EstimateType })
              }}
            >
              <SelectTrigger className="h-8 max-w-[min(100%,22rem)] min-w-48">
                <SelectValue>
                  {estimateTypeMenuLabel(estimate.estimateType)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-72">
                <SelectGroup>
                  {ESTIMATE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.detail
                        ? `${option.label} (${option.detail})`
                        : option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {estimatesEnabled && !isTShirt ? (
            <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium">Allow zero estimates</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  When enabled, issues can be estimated with zero points. You
                  might want to disable this if you want to count parent issues
                  towards the total estimate.
                </p>
              </div>
              <Switch
                checked={estimate.allowZeroEstimates}
                disabled={estimateBusy}
                onCheckedChange={(checked) => {
                  void saveEstimates({ allowZeroEstimates: checked })
                }}
              />
            </div>
          ) : null}

          {estimatesEnabled && !isTShirt ? (
            <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium">Extended estimate scale</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  When enabled, the estimate scale is extended. This is normally
                  not recommended, as large estimates usually mean that an issue
                  should be broken up into smaller issues.
                </p>
              </div>
              <Switch
                checked={estimate.extendedEstimateScale}
                disabled={estimateBusy}
                onCheckedChange={(checked) => {
                  void saveEstimates({ extendedEstimateScale: checked })
                }}
              />
            </div>
          ) : null}

          {estimatesEnabled ? (
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium">Count unestimated issues</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  When enabled, issues that have not been estimated will count
                  as 1 estimate point. When disabled, unestimated issues count
                  as 0 estimate points.
                </p>
              </div>
              <Switch
                checked={estimate.countUnestimatedIssues}
                disabled={estimateBusy}
                onCheckedChange={(checked) => {
                  void saveEstimates({ countUnestimatedIssues: checked })
                }}
              />
            </div>
          ) : null}
        </div>

        {estimateError ? (
          <Alert variant="destructive">
            <AlertDescription>{estimateError}</AlertDescription>
          </Alert>
        ) : null}
      </section>
    </div>
  )
}
