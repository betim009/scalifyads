import Header from "../components/Header.jsx";

export default function PoliticaPrivacidade() {
  const lastUpdated = "2026-05-20";
  const contactEmail = "contato@seudominio.com";

  return (
    <>
      <Header />
      <main className="page">
        <div className="container" style={{ maxWidth: 920 }}>
          <h1 style={{ marginTop: 12 }}>Política de Privacidade</h1>
          <p style={{ color: "var(--muted)" }}>Última atualização: {lastUpdated}</p>

          <h2>1) Sobre este documento</h2>
          <p>
            Esta Política descreve como o Campaign Builder trata dados ao oferecer
            uma interface operacional para criação, gestão e acompanhamento de
            campanhas, incluindo integrações com a Meta (Facebook/Instagram) de
            forma autorizada.
          </p>

          <h2>2) Dados que podem ser coletados e tratados</h2>
          <ul>
            <li>
              Dados de uso do produto (ex.: páginas acessadas e ações realizadas),
              para operação e melhoria da experiência.
            </li>
            <li>
              Dados operacionais de campanhas (ex.: nomes, configurações, estados
              e identificadores técnicos) necessários para organizar e evidenciar
              o que foi criado/gerado no sistema.
            </li>
            <li>
              Dados provenientes de integrações externas (ex.: informações do
              Graph/Ads da Meta) apenas quando o usuário autoriza e fornece as
              permissões necessárias.
            </li>
          </ul>

          <h2>3) Uso de dados da Meta</h2>
          <p>
            Quando habilitado, o Campaign Builder pode consultar e/ou criar
            entidades de campanha via API da Meta (de acordo com permissões
            concedidas). Os dados são usados exclusivamente para viabilizar as
            funcionalidades operacionais do produto e fornecer evidência de
            execução.
          </p>

          <h2>4) Tokens e credenciais</h2>
          <p>
            Tokens de acesso e credenciais sensíveis não são expostos no frontend
            (navegador). O tratamento de tokens ocorre no backend e/ou em
            configurações controladas pelo operador do sistema, seguindo boas
            práticas de segurança.
          </p>

          <h2>5) Compartilhamento</h2>
          <p>
            Não vendemos dados pessoais. Podemos compartilhar informações apenas
            quando necessário para a operação do serviço (ex.: provedores de
            infraestrutura) e/ou quando exigido por lei.
          </p>

          <h2>6) Retenção e segurança</h2>
          <p>
            Mantemos dados pelo tempo necessário para operação, auditoria e
            segurança. Adotamos medidas razoáveis para proteger informações
            contra acesso não autorizado, perda ou alteração.
          </p>

          <h2>7) Seus direitos e contato</h2>
          <p>
            Para dúvidas, solicitações ou exercício de direitos (ex.: acesso,
            correção ou exclusão), entre em contato por:{" "}
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

