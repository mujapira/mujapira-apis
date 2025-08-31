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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useReportBug } from "@/contexts/bug/report-bug-context";


export type SectionItem = {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  onClick?: () => void;
};

export function SidebarBodyComponent() {
  const { currentUser } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const { openReportBug } = useReportBug();

  const DURATION = prefersReducedMotion ? 0 : 0.2;

  // Variants para o grupo e itens (stagger suave)
  const groupVariants = {
    hidden: { opacity: 0, y: -6 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: DURATION,
        when: "beforeChildren",
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        delayChildren: prefersReducedMotion ? 0 : 0.03,
      },
    },
    exit: { opacity: 0, y: -6, transition: { duration: DURATION } },
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -6 },
    show: { opacity: 1, x: 0, transition: { duration: DURATION } },
  };

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
    {
      title: "Reportar um bug",
      url: "",
      icon: Bug,
      onClick: () =>
        openReportBug({
          pageUrl:
            typeof window !== "undefined" ? window.location.href : undefined,
        }),
    },
  ];


  return (
    <>
      <AnimatePresence initial={false} mode="popLayout">
        {currentUser?.isAdmin && (
          <motion.div
            key="admin-section"
            variants={groupVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarMenu>
                {adminSections.map((proj) => (
                  <motion.div key={proj.title} variants={itemVariants}>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        {proj.url ? (
                          <Link
                            href={proj.url}
                            prefetch={true}
                            className="flex items-center"
                          >
                            <proj.icon className="mr-2 h-4 w-4" />
                            <span>{proj.title}</span>
                          </Link>
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
                  </motion.div>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </motion.div>
        )}
      </AnimatePresence>

      {currentUser && (
        <>
          <SidebarGroup>
            <SidebarGroupLabel>Projetos</SidebarGroupLabel>
            <SidebarMenu>
              {projectSections.map((proj) => (
                <SidebarMenuItem key={proj.title}>
                  <SidebarMenuButton asChild>
                    {proj.url ? (
                      <Link href={proj.url} className="flex items-center">
                        <proj.icon className="mr-2 h-4 w-4" />
                        <span>{proj.title}</span>
                      </Link>
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
                      <Link href={proj.url} className="flex items-center">
                        <proj.icon className="mr-2 h-4 w-4" />
                        <span>{proj.title}</span>
                      </Link>
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
      )}
    </>
  );
}
