"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  ClipboardPaste,
  CreditCard,
  LogOut,
  Sparkles,
  UserRound,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth/authContext"
import { AuthModal } from "../auth-modal"
import { useEffect, useRef, useState } from "react"
import { logoutRequest } from "@/services/auth"

export function SidebarFooterComponent() {
  const { isMobile } = useSidebar();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const loginButtonRef = useRef<HTMLButtonElement | null>(null);

  const logout = async () => {
    await logoutRequest();
  }

  const getUserFallBack = () => {
    if (user) {
      const names = user.name.split(" ");
      return names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`
        : names[0][0];
    }
  };

  useEffect(() => {
    if (!authOpen && loginButtonRef.current) {
      loginButtonRef.current.blur();
    }
  }, [authOpen]);

  const loginButtonContent = () => {
    if (user) {
      return (
        <>
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg">
              {getUserFallBack()}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name ?? "a"}</span>
            <span className="truncate text-xs">{user.email ?? "a"}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </>
      );
    } else {
      return (
        <>
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg group-hover:bg-sidebar">
              <UserRound className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm">
            <span className="truncate font-medium">Login</span>
          </div>
          <ClipboardPaste className="ml-auto size-4" />
        </>
      );
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  ref={(el: any) => (loginButtonRef.current = el)}
                  className="group data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground "
                >
                  {loginButtonContent()}
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <div className="grid flex-1 text-left text-sm ">
                      <span className="truncate font-medium">
                        Configurações
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <BadgeCheck />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SidebarMenuButton
              size="lg"
              ref={(el: any) => (loginButtonRef.current = el)}
              onClick={() => setAuthOpen(true)}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {loginButtonContent()}
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      </SidebarMenu>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}

