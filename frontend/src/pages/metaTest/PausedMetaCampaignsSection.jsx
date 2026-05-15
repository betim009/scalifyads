import CollapsibleCard from "./CollapsibleCard.jsx";

export default function PausedMetaCampaignsSection({ metaLoading, metaCampaigns }) {
  return (
    <CollapsibleCard
      id="meta-test-paused-meta-campaigns"
      title="Campanhas PAUSED na Meta (Ads Manager)"
      description="Lista via backend (token continua apenas no backend)."
      meta={<>{metaLoading ? "Carregando..." : `${metaCampaigns.length} item(ns)`}</>}
      defaultOpen={false}
    >

      <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
        <table className="dataTable" style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>Meta Campaign ID</th>
              <th>Nome</th>
              <th>Status</th>
              <th>Effective</th>
              <th>Objective</th>
            </tr>
          </thead>
          <tbody>
            {metaCampaigns.map((c) => (
              <tr key={c.id}>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {c.id}
                </td>
                <td style={{ fontWeight: 900 }}>{c.name || "—"}</td>
                <td className="muted" style={{ fontWeight: 900 }}>
                  {c.status || "—"}
                </td>
                <td className="muted" style={{ fontWeight: 900 }}>
                  {c.effective_status || "—"}
                </td>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {c.objective || "—"}
                </td>
              </tr>
            ))}
            {!metaCampaigns.length ? (
              <tr>
                <td colSpan={5} className="muted" style={{ fontWeight: 800 }}>
                  {metaLoading ? "Carregando..." : "Vazio. Preencha `act_...` e clique em “Listar PAUSED na Meta”."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CollapsibleCard>
  );
}
