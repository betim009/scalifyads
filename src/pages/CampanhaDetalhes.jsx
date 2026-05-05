import { useParams } from "react-router-dom";
import BackLink from "../components/BackLink.jsx";
import { mockCampaigns } from "../data/mockCampaigns.js";

export default function CampanhaDetalhes() {
  const { id } = useParams();
  const campaign = mockCampaigns.find((c) => c.id === id);

  return (
    <>
      <main style={{ background: "#ffffff" }}>
        <div className="container" style={{ paddingTop: 24 }}>
          <BackLink fallbackTo="/mensal" />
          <div style={{ marginTop: 26 }}>
            <h1 className="pageTitle">Detalhes da Campanha</h1>
            <p className="pageSubtitle">
              {campaign ? campaign.name : "Campanha"}
            </p>
          </div>
        </div>
      </main>

      <section className="page" style={{ marginTop: 22 }}>
        <div className="container">
          <div className="card" style={{ padding: 22 }}>
            <div className="muted" style={{ fontWeight: 800 }}>
              Placeholder visual — detalhes serão implementados em versões futuras.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

