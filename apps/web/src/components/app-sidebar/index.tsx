import * as React from "react"
import {
  IconAiAgent,
  IconBookmarkEdit,
  IconBox,
  IconFileChart,
  IconFileCheck,
  IconHelp,
  IconInbox,
  IconSearch,
  IconSettings,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react"

import { NavWorkspace } from "./nav-workspace"
import { NavMain } from "./nav-main"
import { NavTeams } from "./nav-teams"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import { OrgSwitcher, type OrgSwitcherItem } from "./org-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@workspace/ui/components/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Inbox",
      url: "/inbox",
      icon: IconInbox,
    },
    {
      title: "My Issues",
      url: "/issues",
      icon: IconBox,
    },
    {
      title: "Reviews",
      url: "#",
      icon: IconFileCheck,
    },
    {
      title: "Agent",
      url: "#",
      icon: IconAiAgent,
    },
    {
      title: "Drafts",
      url: "#",
      icon: IconBookmarkEdit,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  workspace: [
    {
      name: "Projects",
      url: "/projects",
      icon: IconFileChart,
    },
    {
      name: "Members",
      url: "/members",
      icon: IconUsers,
    },
    {
      name: "Teams",
      url: "/teams",
      icon: IconUsersGroup,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  teams: {
    id: string
    title: string
    url: string
    isActive?: boolean
    cyclesEnabled?: boolean
  }[]
  orgs: OrgSwitcherItem[]
}

export function AppSidebar({ teams, orgs, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <OrgSwitcher orgs={orgs} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavWorkspace items={data.workspace} />
        <NavTeams teams={teams} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
