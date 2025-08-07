"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SidebarHeaderComponent } from "./sidebar-header-component"
import { SidebarFooterComponent } from "./sidebar-footer-compoment"
import { ComponentProps } from "react"
import { SidebarBodyComponent } from "./sidebar-body-compoment"

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarHeaderComponent />
      </SidebarHeader>
      <SidebarContent>
        <SidebarBodyComponent />
      </SidebarContent>
      <SidebarFooter>
        <SidebarFooterComponent />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
