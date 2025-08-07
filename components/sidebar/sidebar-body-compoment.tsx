import {
  MessageCircle,
  MessageSquare,
  Info,
  FileText,
  Server,
  Wand,
  Users,
  Bug,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "../ui/sidebar";
import { useAuth } from "@/contexts/auth/auth-context";

export type SectionItem = {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  onClick?: () => void;
};

export function SidebarBodyComponent() {
  const { currentUser } = useAuth();

  const adminSections: SectionItem[] = [
    { title: "Usuários", url: "/admin/users", icon: Users },
    { title: "Logs", url: "/admin/logs", icon: FileText },
  ];

  const projectSections: SectionItem[] = [
    { title: "Magic Utils", url: "/projects/magicutils", icon: Wand },
    { title: "Servidor Ubuntu", url: "/projects/servidor-ubuntu", icon: Server },
  ];

  const sections: SectionItem[] = [
    { title: "Depoimentos", url: "/testimonials", icon: MessageCircle },
    { title: "Sobre o Site", url: "/about", icon: Info },
    { title: "Artigos", url: "/articles", icon: FileText },
    { title: "Reportar um bug", url: "/report-bug", icon: Bug },
  ];


  return (
    <>
      {currentUser?.isAdmin &&
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarMenu>
            {adminSections.map((proj) => (
              <SidebarMenuItem key={proj.title}>
                <SidebarMenuButton asChild>
                  {proj.url ? (
                    <a href={proj.url} className="flex items-center">
                      <proj.icon className="mr-2 h-4 w-4" />
                      <span>{proj.title}</span>
                    </a>
                  ) : (
                    <button
                      onClick={proj.onClick}
                      className="flex items-center w-full text-left"
                    >
                      <proj.icon className="mr-2 h-4 w-4" />
                      <span>{proj.title}</span>
                    </button>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      }

      <SidebarGroup>
        <SidebarGroupLabel>Projetos</SidebarGroupLabel>
        <SidebarMenu>
          {projectSections.map((proj) => (
            <SidebarMenuItem key={proj.title}>
              <SidebarMenuButton asChild>
                {proj.url ? (
                  <a href={proj.url} className="flex items-center">
                    <proj.icon className="mr-2 h-4 w-4" />
                    <span>{proj.title}</span>
                  </a>
                ) : (
                  <button
                    onClick={proj.onClick}
                    className="flex items-center w-full text-left"
                  >
                    <proj.icon className="mr-2 h-4 w-4" />
                    <span>{proj.title}</span>
                  </button>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Outros</SidebarGroupLabel>
        <SidebarMenu>
          {sections.map((proj) => (
            <SidebarMenuItem key={proj.title}>
              <SidebarMenuButton asChild>
                {proj.url ? (
                  <a href={proj.url} className="flex items-center">
                    <proj.icon className="mr-2 h-4 w-4" />
                    <span>{proj.title}</span>
                  </a>
                ) : (
                  <button
                    onClick={proj.onClick}
                    className="flex items-center w-full text-left"
                  >
                    <proj.icon className="mr-2 h-4 w-4" />
                    <span>{proj.title}</span>
                  </button>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
