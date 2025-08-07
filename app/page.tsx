import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { AuthProvider } from "@/contexts/auth/auth-context";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <h1 className="text-3xl font-bold">Bem-vindo!</h1>

      <p className="text-base leading-relaxed text-muted-foreground">
        Este site é o hub da minha jornada como desenvolvedor full-stack: uma vitrine dos meus projetos e também um laboratório para testar ideias, padrões de código, UI/UX e boas práticas em tempo real.
      </p>

      <h2 className="text-xl font-semibold mt-4">Infraestrutura e Deploy</h2>
      <ul className="list-disc pl-6 leading-relaxed">
        <li>
          <strong>Servidor Ubuntu:</strong> rodando em uma máquina Ubuntu Server com IP estático.
        </li>
        <li>
          <strong>DNS Dinâmico &amp; GoDaddy:</strong> CNAME no GoDaddy apontando para DDNS, mantendo <code>mujapira.com</code> sempre atualizado.
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
          <strong>authService</strong> (C# + PostgreSQL + <strong>Redis</strong>): autenticação, autorização, rate limiting e rotação segura de refresh tokens.
        </li>
        <li>
          <strong>userService</strong> (C# + PostgreSQL): CRUD de usuários e perfis.
        </li>
        <li>
          <strong>logService</strong> (C# + MongoDB + Kafka): coleta e exibe logs assíncronos.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-4">Autenticação e Segurança</h2>
      <p className="leading-relaxed">
        Fluxo de login e manutenção de sessão com foco em defesa em profundidade:
      </p>
      <ul className="list-disc pl-6 leading-relaxed">
        <li>
          <strong>Login:</strong> cliente envia <em>email + password</em> para o endpoint via API Gateway. O AuthService aplica rate limiting por email e IP consultando o Redis para mitigar brute-force.
        </li>
        <li>
          <strong>Tokens:</strong> ao validar credenciais, gera:
          <ul className="list-disc pl-6">
            <li>Access token JWT de curta duração (ex: 15 minutos) com claims como issuer, audience e roles, assinado com key forte.</li>
            <li>Refresh token de longa duração (30 dias) com estado armazenado (usado/expirado) no backend (Redis ou DB).</li>
          </ul>
        </li>
        <li>
          <strong>Entrega:</strong> access token vai no corpo da resposta; refresh token é enviado só via cookie HttpOnly (com Secure em produção e SameSite=Strict), inacessível por JavaScript.
        </li>
        <li>
          <strong>Requisições autenticadas:</strong> cliente coloca o access token no header <code>Authorization: Bearer &lt;accessToken&gt;</code>. Os serviços validam assinatura, issuer, audience, expiração e políticas adicionais.
        </li>
        <li>
          <strong>Refresh seguro:</strong> ao expirar o access token, o cliente chama <code>/refresh</code>, o cookie é enviado automaticamente. O AuthService valida origem (Origin/Referer), aplica rate limiting por refresh token, checa existência, validade e detecção de reuse. Faz a rotação: invalida o refresh token antigo, emite um novo (persistido) e um novo access token.
        </li>
        <li>
          <strong>Detecção de comprometimento:</strong> reuse de refresh token invalida a sessão inteira e sinaliza possível comprometimento.
        </li>
        <li>
          <strong>Logout:</strong> cliente aciona logout; o refresh token é invalidado no backend e o cookie é limpo com expiração passada.
        </li>
        <li>
          <strong>Defesas adicionais:</strong> uso obrigatório de HTTPS em produção, validações de origem, e separação clara de escopo entre access e refresh token para limitar blast radius.
        </li>
      </ul>

      <blockquote className="border-l-4 border-primary pl-4 italic leading-relaxed mt-4">
        <strong>Status:</strong> este é um projeto em andamento — a infraestrutura já está de pé, mas novas funcionalidades e seções ainda estão sendo desenvolvidas.
      </blockquote>

      <p className="mt-4 leading-relaxed">
        Em breve: artigos técnicos, tutoriais passo a passo e demos interativos para você reproduzir essa arquitetura. Sinta-se à vontade para explorar e acompanhar a evolução do Mujapira.com!
      </p>
    </div>
  );
}
