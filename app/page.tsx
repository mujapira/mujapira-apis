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

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <h1 className="text-3xl font-bold">Bem-vindo ao Mujapira.com!</h1>

          <p className="text-base leading-relaxed text-muted-foreground">
            Este site é o hub da minha jornada como desenvolvedor full-stack: uma vitrine dos meus projetos e também um laboratório para testar ideias, padrões de código, UI/UX e boas práticas em tempo real.
          </p>

          <h2 className="text-xl font-semibold mt-4">Infraestrutura e Deploy</h2>
          <ul className="list-disc pl-6 leading-relaxed">
            <li>
              <strong>Servidor Ubuntu:</strong> rodando em uma máquina Ubuntu Server com IP estático.
            </li>
            <li>
              <strong>DNS Dinâmico &amp; GoDaddy:</strong> CNAME no GoDaddy apontando para DDNS, mantendo <code>mujapira.com</code> sempre atualizado.
            </li>
            <li>
              <strong>Reverse Proxy:</strong> Nginx faz SSL e roteamento de tráfego para os contêineres Docker.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-4">Contêineres Docker e CI/CD</h2>
          <p className="leading-relaxed">
            Toda a aplicação está empacotada em <strong>contêineres Docker</strong>, orquestrados por <strong>docker-compose</strong>. No meu pipeline de <strong>GitHub Actions</strong>, tenho passos que:
          </p>
          <ol className="list-decimal pl-6 leading-relaxed">
            <li>Restauram dependências e compilam cada serviço em C#;</li>
            <li>Geram imagens Docker e fazem push para o registry;</li>
            <li>Fazem deploy via SSH, atualizando contêineres com docker-compose.</li>
          </ol>

          <h2 className="text-xl font-semibold mt-4">Arquitetura de Microserviços</h2>
          <p className="leading-relaxed">
            No coração do site, um <strong>API Gateway em C# com Ocelot</strong> unifica as rotas para:
          </p>
          <ul className="list-disc pl-6 leading-relaxed">
            <li>
              <strong>authService</strong> (C# + PostgreSQL): autenticação e autorização.
            </li>
            <li>
              <strong>userService</strong> (C# + PostgreSQL): CRUD de usuários e perfis.
            </li>
            <li>
              <strong>logService</strong> (C# + MongoDB + Kafka): coleta e exibe logs assíncronos.
            </li>
          </ul>

          <blockquote className="border-l-4 border-primary pl-4 italic leading-relaxed mt-4">
            <strong>Status:</strong> este é um projeto em andamento — a infraestrutura já está de pé, mas novas funcionalidades e seções ainda estão sendo desenvolvidas.
          </blockquote>

          <p className="mt-4 leading-relaxed">
            Em breve: artigos técnicos, tutoriais passo a passo e demos interativos para você reproduzir essa arquitetura. Sinta-se à vontade para explorar e acompanhar a evolução do Mujapira.com!
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
