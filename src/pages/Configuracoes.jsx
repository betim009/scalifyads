import BackLink from "../components/BackLink.jsx";

export default function Configuracoes() {
  const countries = [
    { name: "Brasil", code: "BR", lang: "PT", flag: "🇧🇷" },
    { name: "EUA", code: "US", lang: "EN", flag: "🇺🇸" },
    { name: "México", code: "MX", lang: "ES", flag: "🇲🇽" },
    { name: "Emirados", code: "AE", lang: "AR", flag: "🇦🇪" },
    { name: "França", code: "FR", lang: "FR", flag: "🇫🇷" },
    { name: "Espanha", code: "ES", lang: "ES", flag: "🇪🇸" },
  ];

  const otherSettings = [
    { title: "Tradução automática", desc: "Ativada para todos os idiomas" },
    { title: "Detecção de idioma", desc: "Baseada em nome de arquivo" },
    { title: "Modo de publicação", desc: "Publicar todas as campanhas simultaneamente" },
  ];

  return (
    <>
      <main style={{ background: "#ffffff" }}>
        <div className="container" style={{ paddingTop: 24 }}>
          <BackLink />
          <div style={{ marginTop: 34, textAlign: "center" }}>
            <h1 className="pageTitle">Configurações</h1>
            <p className="pageSubtitle">
              Gerencie os países e idiomas do sistema
            </p>
          </div>
        </div>
      </main>

      <section className="page" style={{ marginTop: 22 }}>
        <div className="container">
          <div style={{ maxWidth: 940, margin: "0 auto" }}>
            <section className="card settingsCard" aria-label="Países fixos do sistema">
              <div className="settingsCardInner">
                <h2 className="settingsCardTitle">Países fixos do sistema</h2>
                <p className="settingsCardDesc">
                  Esses países serão usados para gerar campanhas automaticamente
                </p>
              </div>

              <div className="settingsList">
                {countries.map((c) => (
                  <div key={c.code} className="settingsRow">
                    <div className="settingsLeft">
                      <div className="flagBox" aria-hidden="true">
                        {c.flag}
                      </div>
                      <div>
                        <p className="countryName">{c.name}</p>
                        <div className="countryCode">Código: {c.code}</div>
                      </div>
                    </div>
                    <div className="languageBadge">Idioma: {c.lang}</div>
                  </div>
                ))}
              </div>

              <div className="noticeBox">
                <div className="noticeIcon" aria-hidden="true">
                  i
                </div>
                <div>
                  A configuração de países será editável em versões futuras. Por
                  enquanto, esses países estão fixos no sistema.
                </div>
              </div>
            </section>

            <section
              className="card settingsCard"
              aria-label="Outras Configurações"
              style={{ marginTop: 22 }}
            >
              <div className="settingsCardInner">
                <h2 className="settingsCardTitle">Outras Configurações</h2>
              </div>

              <div className="settingsList">
                {otherSettings.map((s) => (
                  <div key={s.title} className="settingsRow">
                    <div>
                      <p className="otherRowTitle">{s.title}</p>
                      <p className="otherRowDesc">{s.desc}</p>
                    </div>
                    <div className="activeBadge">Ativo</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
