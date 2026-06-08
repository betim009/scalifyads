import CollapsibleCard from "./CollapsibleCard.jsx";
import JsonAccordion from "./JsonAccordion.jsx";

export default function GeneratedStructureSection({
  generatedCampaignId,
  structureForId,
  loading,
  error,
  errorDetails,
  generatedAdSets,
  generatedAds,
  refreshDisabled,
  onRefresh,
  onDismissError,
  safeJson,
}) {
  const hasSelection = Boolean(generatedCampaignId);
  const isStale = hasSelection && structureForId && structureForId !== generatedCampaignId;

  return (
    <CollapsibleCard
      id="meta-test-db-structure"
      title="Estrutura persistida (DB) — AdSet/Ad"
      description="Evidência de persistência em `generated_adsets` / `generated_ads` por `generated_campaign_id`."
      meta={
        <>
          Seleção: <b>{generatedCampaignId || "—"}</b>
          {isStale ? " (carregado para outro id — atualize)" : ""}
        </>
      }
      defaultOpen={false}
      headerRight={
        <button type="button" className="pillOutline" onClick={onRefresh} disabled={refreshDisabled}>
          {loading ? "Carregando..." : "Carregar estrutura"}
        </button>
      }
    >

      {!hasSelection ? (
        <div className="muted" style={{ fontWeight: 800 }}>
          Selecione um registro em `generated_campaigns` para listar a estrutura persistida.
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Erro</div>
            <button
              type="button"
              className="pillOutline"
              onClick={onDismissError}
              style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
            >
              Fechar
            </button>
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{error}</div>
          <JsonAccordion title="Detalhes (estrutura DB)" value={errorDetails} safeJson={safeJson} />
        </div>
      ) : null}

      <div style={{ marginTop: hasSelection ? 12 : 0, borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
        <table className="dataTable" style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Criado</th>
              <th>ID (DB)</th>
              <th>Meta ID</th>
              <th>Nome</th>
              <th>configured_status</th>
              <th>effective_status</th>
              <th>Creative</th>
              <th>Ref</th>
            </tr>
          </thead>
          <tbody>
            {(generatedAdSets ?? []).map((row) => (
              <tr key={`adset-${row.id}`}>
                <td style={{ fontWeight: 900 }}>AdSet</td>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {row.created_at ? String(row.created_at).slice(0, 19).replace("T", " ") : "—"}
                </td>
                <td className="muted" style={{ fontWeight: 800 }}>{row.id}</td>
                <td className="muted" style={{ fontWeight: 800 }}>{row.meta_adset_id || "—"}</td>
                <td style={{ fontWeight: 900 }}>{row.name || "—"}</td>
                <td className="muted" style={{ fontWeight: 900 }}>{row.configured_status || row.status || "—"}</td>
                <td className="muted" style={{ fontWeight: 900 }}>{row.effective_status || "—"}</td>
                <td className="muted" style={{ fontWeight: 800 }}>—</td>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {row.generated_campaign_id || "—"}
                </td>
              </tr>
            ))}
            {(generatedAds ?? []).map((row) => (
              <tr key={`ad-${row.id}`}>
                <td style={{ fontWeight: 900 }}>Ad</td>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {row.created_at ? String(row.created_at).slice(0, 19).replace("T", " ") : "—"}
                </td>
                <td className="muted" style={{ fontWeight: 800 }}>{row.id}</td>
                <td className="muted" style={{ fontWeight: 800 }}>{row.meta_ad_id || "—"}</td>
                <td style={{ fontWeight: 900 }}>{row.name || "—"}</td>
                <td className="muted" style={{ fontWeight: 900 }}>{row.configured_status || row.status || "—"}</td>
                <td className="muted" style={{ fontWeight: 900 }}>{row.effective_status || "—"}</td>
                <td className="muted" style={{ fontWeight: 800 }}>{row.creative_draft_id || "—"}</td>
                <td className="muted" style={{ fontWeight: 800 }}>
                  {row.generated_adset_id ? `adset:${row.generated_adset_id}` : row.generated_campaign_id || "—"}
                </td>
              </tr>
            ))}
            {!loading && !error && !(generatedAdSets ?? []).length && !(generatedAds ?? []).length && hasSelection ? (
              <tr>
                <td colSpan={9} className="muted" style={{ fontWeight: 800 }}>
                  Vazio. Crie AdSet/Ad ou clique em “Carregar estrutura”.
                </td>
              </tr>
            ) : null}
            {loading && hasSelection && !(generatedAdSets ?? []).length && !(generatedAds ?? []).length ? (
              <tr>
                <td colSpan={9} className="muted" style={{ fontWeight: 800 }}>
                  Carregando...
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CollapsibleCard>
  );
}
