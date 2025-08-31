"use client";

import Link from "next/link";
import Image from "next/image";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function SidebarHeaderComponent() {
  const activeTeam = {
    name: "Mujapira",
    plan: "Central do desenvolvedor",
    logo: () => (
      <Image
        alt="logo"
        src="/images/android-chrome-512x512.png"
        width={32}
        height={32}
      />
    ),
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          className="justify-start"
          title="Ir para a página inicial"
        >
          <Link href="/" prefetch className="flex items-center w-full">
            <div className="bg-card p-1 text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              {activeTeam.logo()}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeTeam.name}</span>
              <span className="truncate text-xs">{activeTeam.plan}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
