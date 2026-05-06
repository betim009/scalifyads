import { mockCountries } from "../data/mockCountries.js";
import PageShell from "../components/PageShell.jsx";

export default function Configuracoes() {
  const otherSettings = [
    { title: "Tradução automática", desc: "Ativada para todos os idiomas" },
    { title: "Detecção de idioma", desc: "Baseada em nome de arquivo" },
    { title: "Modo de publicação", desc: "Publicar todas as campanhas simultaneamente" },
  ];

  return (
    <PageShell
      title="Configurações"
      subtitle="Gerencie os países e idiomas do sistema"
      align="center"
      backFallbackTo="/mensal"
    >
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        <section className="card settingsCard" aria-label="Países fixos do sistema">
              <div className="settingsCardInner">
                <h2 className="settingsCardTitle">Países fixos do sistema</h2>
                <p className="settingsCardDesc">
                  Esses países serão usados para gerar campanhas automaticamente
                </p>
              </div>

              <div className="settingsList">
                {mockCountries.map((c) => (
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
          style={{ marginTop: 24 }}
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
    </PageShell>
  );
}
