import { useParams } from "react-router-dom";
import { mockCampaigns } from "../data/mockCampaigns.js";
import PageShell from "../components/PageShell.jsx";

export default function CampanhaDetalhes() {
  const { id } = useParams();
  const campaign = mockCampaigns.find((c) => c.id === id);

  return (
    <PageShell
      title="Detalhes da Campanha"
      subtitle={campaign ? campaign.name : "Campanha"}
      backFallbackTo="/mensal"
    >
      <div className="card" style={{ padding: 22 }}>
        <div className="muted" style={{ fontWeight: 800 }}>
          Placeholder visual — detalhes serão implementados em versões futuras.
        </div>
      </div>
    </PageShell>
  );
}
