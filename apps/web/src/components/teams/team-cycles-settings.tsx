import * as React from "react"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import {
  CYCLE_DURATION_WEEKS,
  CYCLE_START_DAYS,
  cycleDurationLabel,
  cycleStartDayLabel,
  formatCycleRangeLabel,
  getCurrentCycleNumber,
  updateTeamCycleSettings,
  type TeamCycleSettings,
} from "@/lib/cycles"

type TeamCyclesSettingsProps = {
  teamId: string
  teamName: string
  cyclesEnabled: boolean
  cycleDurationWeeks: number
  cycleStartDay: number
  cyclesOrigin: Date | string | null
}

export function TeamCyclesSettings({
  teamId,
  teamName,
  cyclesEnabled: initialEnabled,
  cycleDurationWeeks: initialDuration,
  cycleStartDay: initialStartDay,
  cyclesOrigin: initialOrigin,
}: TeamCyclesSettingsProps) {
  const { mutate, pending } = useServerMutation()
  const [enabled, setEnabled] = React.useState(initialEnabled)
  const [durationWeeks, setDurationWeeks] = React.useState(initialDuration)
  const [startDay, setStartDay] = React.useState(initialStartDay)
  const [origin, setOrigin] = React.useState(initialOrigin)

  React.useEffect(() => {
    setEnabled(initialEnabled)
    setDurationWeeks(initialDuration)
    setStartDay(initialStartDay)
    setOrigin(initialOrigin)
  }, [initialEnabled, initialDuration, initialStartDay, initialOrigin])

  const settings: TeamCycleSettings = {
    cyclesEnabled: enabled,
    cycleDurationWeeks: durationWeeks,
    cycleStartDay: startDay,
    cyclesOrigin: origin,
  }
  const currentNumber = getCurrentCycleNumber(settings)
  const helper =
    enabled && currentNumber != null
      ? `Current cycle is ${formatCycleRangeLabel(settings, currentNumber)}, next cycle begins after that window.`
      : null

  async function save(next: {
    cyclesEnabled: boolean
    cycleDurationWeeks: number
    cycleStartDay: number
  }) {
    setEnabled(next.cyclesEnabled)
    setDurationWeeks(next.cycleDurationWeeks)
    setStartDay(next.cycleStartDay)
    try {
      const result = await mutate(
        () =>
          updateTeamCycleSettings({
            data: { teamId, ...next },
          }),
        { errorMessage: "Could not update cycle settings" }
      )
      setOrigin(result.cyclesOrigin)
      setEnabled(result.cyclesEnabled)
      setDurationWeeks(result.cycleDurationWeeks)
      setStartDay(result.cycleStartDay)
    } catch {
      setEnabled(initialEnabled)
      setDurationWeeks(initialDuration)
      setStartDay(initialStartDay)
      setOrigin(initialOrigin)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cycles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cycles create rhythm and focus with short, time-boxed planning windows
          for {teamName}. Issues that aren&apos;t finished can stay attached to a
          past cycle or be moved into the current one.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
        <div>
          <Label htmlFor="enable-cycles" className="text-sm font-medium">
            Enable cycles
          </Label>
          <p className="text-xs text-muted-foreground">
            Show Cycles in the team sidebar and allow attaching issues to the
            current cycle.
          </p>
        </div>
        <Switch
          id="enable-cycles"
          checked={enabled}
          disabled={pending}
          onCheckedChange={(checked) =>
            void save({
              cyclesEnabled: checked,
              cycleDurationWeeks: durationWeeks,
              cycleStartDay: startDay,
            })
          }
        />
      </div>

      <div
        className={`flex flex-col gap-5 rounded-lg border p-4 ${!enabled ? "opacity-60" : ""}`}
      >
        <div className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
          <Label className="text-sm">Cycle duration</Label>
          <Select
            value={String(durationWeeks)}
            disabled={!enabled || pending}
            onValueChange={(value) => {
              const next =
                typeof value === "string"
                  ? value
                  : typeof value === "object" &&
                      value !== null &&
                      "value" in value &&
                      typeof (value as { value: unknown }).value === "string"
                    ? (value as { value: string }).value
                    : null
              if (next == null) return
              void save({
                cyclesEnabled: enabled,
                cycleDurationWeeks: Number(next),
                cycleStartDay: startDay,
              })
            }}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue>{cycleDurationLabel(durationWeeks)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CYCLE_DURATION_WEEKS.map((weeks) => (
                  <SelectItem key={weeks} value={String(weeks)}>
                    {cycleDurationLabel(weeks)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
          <Label className="text-sm">Cycle start day</Label>
          <div className="flex flex-col gap-1.5">
            <Select
              value={String(startDay)}
              disabled={!enabled || pending}
              onValueChange={(value) => {
                const next =
                  typeof value === "string"
                    ? value
                    : typeof value === "object" &&
                        value !== null &&
                        "value" in value &&
                        typeof (value as { value: unknown }).value === "string"
                      ? (value as { value: string }).value
                      : null
                if (next == null) return
                void save({
                  cyclesEnabled: enabled,
                  cycleDurationWeeks: durationWeeks,
                  cycleStartDay: Number(next),
                })
              }}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue>{cycleStartDayLabel(startDay)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CYCLE_START_DAYS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {helper ? (
              <p className="text-xs text-muted-foreground">{helper}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
