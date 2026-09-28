import * as React from "react"
import { Link } from "@tanstack/react-router"
import { IconDots, IconPlus, IconSearch } from "@tabler/icons-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { useServerMutation } from "@/hooks/use-server-mutation"
import {
  acceptTeamJoinRequest,
  addMemberToTeam,
  declineTeamJoinRequest,
  removeMemberFromTeam,
} from "@/lib/teams"

export type TeamMemberRow = {
  id: string
  userId: string
  name: string
  email: string
  image: string | null
  role: string | null
  createdAt: string | null
}

export type OrgMemberOption = {
  userId: string
  name: string
  email: string
  image: string | null
  role: string
}

export type TeamJoinRequestRow = {
  id: string
  actorId: string
  actorName: string
  actorEmail: string
  actorImage: string | null
  createdAt: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

function roleLabel(role: string | null) {
  if (!role) return "Member"
  if (role === "owner") return "Owner"
  if (role === "admin") return "Workspace admin"
  return "Member"
}

function formatRequestedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

type TeamMembersSettingsProps = {
  teamId: string
  teamName: string
  members: TeamMemberRow[]
  candidates: OrgMemberOption[]
  invitations: TeamJoinRequestRow[]
  /** When false, hides the settings back-link. */
  showBackLink?: boolean
  title?: string
}

export function TeamMembersSettings({
  teamId,
  teamName,
  members,
  candidates,
  invitations,
  showBackLink = true,
  title = "Team members",
}: TeamMembersSettingsProps) {
  const { mutate, pending: busy } = useServerMutation()
  const [tab, setTab] = React.useState("members")
  const [query, setQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [addOpen, setAddOpen] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState(
    candidates[0]?.userId ?? ""
  )
  const [inviteBusyId, setInviteBusyId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setSelectedUserId(candidates[0]?.userId ?? "")
  }, [candidates])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (roleFilter === "admins") {
        const role = (m.role ?? "").toLowerCase()
        if (role !== "admin" && role !== "owner") return false
      }
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      )
    })
  }, [members, query, roleFilter])

  const candidateItems = candidates.map((c) => ({
    label: `${c.name} (${c.email})`,
    value: c.userId,
  }))

  async function handleAdd() {
    if (!selectedUserId) return
    setError(null)
    try {
      await mutate(
        () =>
          addMemberToTeam({
            data: { teamId, userId: selectedUserId },
          }),
        { errorMessage: "Could not add member" }
      )
      setAddOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add member")
    }
  }

  async function handleRemove(userId: string) {
    setError(null)
    try {
      await mutate(
        () => removeMemberFromTeam({ data: { teamId, userId } }),
        { errorMessage: "Could not remove member" }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove member")
    }
  }

  async function handleAcceptInvite(invite: TeamJoinRequestRow) {
    setInviteBusyId(invite.id)
    setError(null)
    try {
      await mutate(
        () =>
          acceptTeamJoinRequest({
            data: {
              teamId,
              userId: invite.actorId,
              notificationId: invite.id,
            },
          }),
        {
          successMessage: `${invite.actorName} added to ${teamName}`,
          errorMessage: "Could not accept request",
        }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept request")
    } finally {
      setInviteBusyId(null)
    }
  }

  async function handleDeclineInvite(invite: TeamJoinRequestRow) {
    setInviteBusyId(invite.id)
    setError(null)
    try {
      await mutate(
        () =>
          declineTeamJoinRequest({
            data: { teamId, userId: invite.actorId },
          }),
        {
          successMessage: "Join request declined",
          errorMessage: "Could not decline request",
        }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decline request")
    } finally {
      setInviteBusyId(null)
    }
  }

  const filterItems = [
    { label: "All", value: "all" },
    { label: "Admins", value: "admins" },
  ]

  const addMemberButton = (
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <IconPlus data-icon="inline-start" />
        Add a member
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a member</DialogTitle>
          <DialogDescription>
            Add an existing workspace member to this team.
          </DialogDescription>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Everyone in the workspace is already on this team.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <Select
              items={candidateItems}
              value={selectedUserId}
              onValueChange={(value) => {
                if (value === null) return
                setSelectedUserId(value)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {candidateItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button onClick={() => void handleAdd()} disabled={busy}>
              {busy ? <Spinner data-icon="inline-start" /> : null}
              Add to team
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  return (
    <div
      className={
        showBackLink
          ? "mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 lg:px-6"
          : "flex w-full flex-col gap-4"
      }
    >
      {showBackLink ? (
        <div>
          <Link
            to="/team/$teamId/settings"
            params={{ teamId }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {teamName}
          </Link>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {tab === "members" ? addMemberButton : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {tab === "members" ? addMemberButton : null}
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (typeof value === "string") setTab(value)
        }}
      >
        <TabsList variant="line">
          <TabsTrigger value="members">
            Members
            <Badge variant="secondary" className="ml-1">
              {members.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Requests
            <Badge variant="secondary" className="ml-1">
              {invitations.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              items={filterItems}
              value={roleFilter}
              onValueChange={(value) => {
                if (value === null) return
                setRoleFilter(value)
              }}
            >
              <SelectTrigger size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {filterItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {error && tab === "members" ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No team members yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => {
                    const label = roleLabel(m.role)
                    const isOwner = label === "Owner"
                    const isAdmin = label === "Workspace admin"
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              {m.image ? (
                                <AvatarImage src={m.image} alt={m.name} />
                              ) : null}
                              <AvatarFallback className="text-[10px]">
                                {getInitials(m.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{m.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {m.email}
                        </TableCell>
                        <TableCell>
                          {isOwner || isAdmin ? (
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              {label}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {label}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon-sm" />
                              }
                            >
                              <IconDots className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => void handleRemove(m.userId)}
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4 flex flex-col gap-4">
          {error && tab === "invitations" ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No pending join requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  invitations.map((invite) => {
                    const busyInvite = inviteBusyId === invite.id
                    return (
                      <TableRow key={invite.actorId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              {invite.actorImage ? (
                                <AvatarImage
                                  src={invite.actorImage}
                                  alt={invite.actorName}
                                />
                              ) : null}
                              <AvatarFallback className="text-[10px]">
                                {getInitials(invite.actorName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {invite.actorName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {invite.actorEmail}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRequestedAt(invite.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyInvite}
                              onClick={() => void handleDeclineInvite(invite)}
                            >
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              disabled={busyInvite}
                              onClick={() => void handleAcceptInvite(invite)}
                            >
                              {busyInvite ? (
                                <Spinner data-icon="inline-start" />
                              ) : null}
                              Accept
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
