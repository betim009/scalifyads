import Header from "../components/Header.jsx";

export default function ExclusaoDados() {
  const lastUpdated = "2026-05-20";
  const contactEmail = "contato@seudominio.com";

  return (
    <>
      <Header />
      <main className="page">
        <div className="container" style={{ maxWidth: 920 }}>
          <h1 style={{ marginTop: 12 }}>Exclusão de Dados do Usuário</h1>
          <p style={{ color: "var(--muted)" }}>Última atualização: {lastUpdated}</p>

          <h2>1) Como solicitar a exclusão</h2>
          <p>
            Para solicitar exclusão de dados associados ao seu uso do Campaign
            Builder, envie um email para{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a> informando:
          </p>
          <ul>
            <li>Seu nome e empresa (se aplicável)</li>
            <li>Identificação do acesso/conta usada no sistema (se houver)</li>
            <li>Quais dados você deseja excluir (ou “exclusão completa”)</li>
          </ul>

          <h2>2) Prazo de atendimento</h2>
          <p>
            Buscamos responder em até <strong>7 dias corridos</strong> e concluir
            a exclusão em até <strong>30 dias</strong>, salvo necessidade de
            prorrogação por motivos técnicos, segurança ou obrigação legal.
          </p>

          <h2>3) O que pode ser removido</h2>
          <ul>
            <li>Registros operacionais associados ao seu uso (quando aplicável)</li>
            <li>Dados de campanhas armazenados localmente no sistema</li>
            <li>Rascunhos e artefatos criados dentro da aplicação</li>
          </ul>

          <h2>4) O que pode ser mantido</h2>
          <p>
            Alguns registros técnicos mínimos podem ser mantidos quando
            necessários para segurança, prevenção a fraudes, auditoria,
            atendimento a incidentes e/ou obrigações legais.
          </p>

          <h2>5) Dados em plataformas externas</h2>
          <p>
            Dados e entidades criadas em plataformas de terceiros (ex.: Meta Ads)
            seguem as políticas e mecanismos de exclusão do respectivo provedor.
            Podemos orientar, mas não controlamos a retenção nesses serviços.
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

