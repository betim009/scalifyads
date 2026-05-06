import { useParams } from "react-router-dom";
import { mockCampaigns } from "../data/mockCampaigns.js";
import PageShell from "../components/PageShell.jsx";

export default function CampanhaDuplicar() {
  const { id } = useParams();
  const campaign = mockCampaigns.find((c) => c.id === id);

  return (
    <PageShell
      title="Duplicar Campanha"
      subtitle={campaign ? campaign.name : "Campanha"}
      backFallbackTo={`/campanhas/${id}`}
    >
      <div className="card" style={{ padding: 22 }}>
        <div className="muted" style={{ fontWeight: 800 }}>
          Placeholder visual — fluxo de duplicação será implementado em versões futuras.
        </div>
      </div>
    </PageShell>
  );
}
