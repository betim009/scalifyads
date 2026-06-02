import Header from "../components/Header.jsx";

export default function TermosDeUso() {
  const lastUpdated = "2026-05-20";
  const contactEmail = "contato@seudominio.com";

  return (
    <>
      <Header />
      <main className="page">
        <div className="container" style={{ maxWidth: 920 }}>
          <h1 style={{ marginTop: 12 }}>Termos de Uso</h1>
          <p style={{ color: "var(--muted)" }}>Última atualização: {lastUpdated}</p>

          <h2>1) Aceite</h2>
          <p>
            Ao acessar e utilizar o ScalifyAds, você concorda com estes
            Termos. Se não concordar, não utilize o serviço.
          </p>

          <h2>2) O que o ScalifyAds faz</h2>
          <p>
            O ScalifyAds é uma ferramenta operacional de apoio à criação,
            gestão e acompanhamento de campanhas. Ele pode integrar-se a serviços
            de terceiros (como a Meta) para executar ações e/ou consultar dados
            conforme permissões concedidas.
          </p>

          <h2>3) Responsabilidades do usuário</h2>
          <ul>
            <li>
              Manter a segurança de seus acessos e permissões, incluindo contas e
              ativos em plataformas externas.
            </li>
            <li>
              Garantir que possui autorização para operar contas, páginas, pixels
              e demais recursos utilizados.
            </li>
            <li>
              Responder pela configuração e pelos resultados de campanhas
              criadas/gerenciadas a partir do uso do produto.
            </li>
          </ul>

          <h2>4) Integrações externas (Meta e outros)</h2>
          <p>
            O funcionamento de integrações depende de disponibilidade, regras,
            limites e permissões dos provedores externos. O ScalifyAds não
            garante disponibilidade contínua de APIs de terceiros.
          </p>

          <h2>5) Uso aceitável</h2>
          <p>
            Você concorda em não usar o serviço para fins ilegais, violação de
            direitos de terceiros, tentativa de acesso não autorizado, ou ações
            que possam comprometer a segurança do sistema.
          </p>

          <h2>6) Alterações</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. A versão mais recente
            será publicada nesta página, com a data de atualização.
          </p>

          <h2>7) Contato</h2>
          <p>
            Em caso de dúvidas sobre estes Termos, contate:{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
          <p style={{ marginTop: 24, color: "var(--muted)" }}>
            Observação: substitua o email de contato por um endereço real antes
            de publicar em produção.
          </p>
        </div>
      </main>
    </>
  );
}
