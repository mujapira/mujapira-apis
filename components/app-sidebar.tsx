"use client"

import * as React from "react"
import {
  AudioWaveform,
  Banana,
  BookOpen,
  Bot,
  ClipboardCheck,
  Code,
  Command,
  Frame,
  GalleryVerticalEnd,
  Layers,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Mujapira",
      plan: "Developer Hub",
    },
  ],
  navMain: [
    {
      title: "Magic Utils",
      url: "#",
      icon: Layers,
      isActive: false,
      items: [
        {
          title: "Acessar",
          url: "",
        },
        {
          title: "Github",
          url: "https://github.com/mujapira/magic-utils",
        },
      ],
    },
    {
      title: "App Tarefas",
      url: "#",
      icon: ClipboardCheck,
      isActive: false,
      items: [
        {
          title: "Acessar",
          url: "",
        },
        {
          title: "Github",
          url: "https://github.com/mujapira/magic-utils",
        },
      ],
    }
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
