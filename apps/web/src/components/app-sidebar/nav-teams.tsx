import { Link } from "@tanstack/react-router"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar"
import {
  IconBugFilled,
  IconFileChart,
  IconHistory,
  IconHome,
  IconReport,
  IconSettings2,
} from "@tabler/icons-react"

export function NavTeams({
  teams,
}: {
  teams: {
    id: string
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    cyclesEnabled?: boolean
  }[]
}) {
  if (teams.length === 0) {
    return null
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Teams</SidebarGroupLabel>
      <SidebarMenu>
        {teams.map((item) => (
          <Collapsible
            key={item.id}
            defaultOpen={item.isActive}
            className="group/collapsible"
            render={<SidebarMenuItem />}
          >
            <CollapsibleTrigger
              render={<SidebarMenuButton tooltip={item.title} />}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>

              <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub className="px-0 mx-2">
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    render={
                      <Link
                        to="/team/$teamId"
                        params={{ teamId: item.id }}
                      />
                    }
                  >
                    <IconHome /> <span>Home</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    render={
                      <Link
                        to="/team/$teamId/triage"
                        params={{ teamId: item.id }}
                      />
                    }
                  >
                    <IconReport /> <span>Triage</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    render={
                      <Link
                        to="/issues"
                        search={{ team_id: item.id }}
                      />
                    }
                  >
                    <IconBugFilled /> <span>Issues</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                {item.cyclesEnabled ? (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={
                        <Link
                          to="/team/$teamId/cycles"
                          params={{ teamId: item.id }}
                        />
                      }
                    >
                      <IconHistory /> <span>Cycles</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ) : null}
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    render={
                      <Link
                        to="/team/$teamId/projects"
                        params={{ teamId: item.id }}
                      />
                    }
                  >
                    <IconFileChart /> <span>Projects</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    render={
                      <Link
                        to="/team/$teamId/settings"
                        params={{ teamId: item.id }}
                      />
                    }
                  >
                    <IconSettings2 /> <span>Settings</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
