import * as React from "react"
import {
  Command,
  CommandInput,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

export function MetaPillTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-transparent bg-secondary px-2 text-xs font-normal text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-open:bg-secondary/80",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function MetaIconTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-open:bg-muted data-open:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function MetaMenu({
  open,
  onOpenChange,
  trigger,
  placeholder,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactElement
  placeholder: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className={cn("w-64 gap-0 p-0", className)}
      >
        <Command shouldFilter={true}>
          <CommandInput placeholder={placeholder} />
          <CommandList className="max-h-64">{children}</CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
