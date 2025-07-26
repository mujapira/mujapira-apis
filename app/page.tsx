import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <h1 className="text-2xl font-semibold">Bem-vindo!</h1>
          <p className="text-muted-foreground leading-relaxed">
            Este site foi criado com o objetivo de documentar minha jornada como desenvolvedor de software. Aqui, compartilho projetos, estudos, experimentos e ferramentas que venho criando ao longo do tempo.
          </p>
          <p className="leading-relaxed">
            Meu nome é <strong>Maurício</strong> e sou um desenvolvedor full stack apaixonado por criar soluções úteis e eficientes.
          </p>
          <p className="leading-relaxed">
            Este site é um projeto pessoal, usado tanto como vitrine quanto como laboratório para testar ideias, padrões de código, UI/UX e boas práticas. Se você gosta de tecnologia, código limpo e soluções bem pensadas, sinta-se em casa.
          </p>
          <p className="leading-relaxed">
            Em breve, adicionarei seções com artigos e tutoriais que venho escrevendo no meu tempo livre.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
