import { useParams } from "react-router-dom";
import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { getCampaign, generateCampaigns } from "../services/campaigns.js";
import { listGeneratedCampaigns, markGeneratedPublished } from "../services/generatedCampaigns.js";
import { countryCodeToFlag } from "../services/fallbacks.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { syncGeneratedCampaign } from "../services/meta.js";

export default function CampanhaDetalhes() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [generated, setGenerated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [metaIdDraftByGeneratedId, setMetaIdDraftByGeneratedId] = useState({});

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [campaignRes, generatedRes] = await Promise.all([
        getCampaign(id),
        listGeneratedCampaigns({ campaignId: id }),
      ]);
      setCampaign(campaignRes.campaign);
      setGenerated(generatedRes.generatedCampaigns ?? []);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao carregar campanha.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [id]);

  const countryCodes = useMemo(() => campaign?.countryCodes ?? [], [campaign]);

  return (
    <PageShell
      title="Detalhes da Campanha"
      subtitle={campaign ? campaign.name : "Campanha"}
      backFallbackTo="/mensal"
    >
      {error ? (
        <div className="card" style={{ padding: 18, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ fontWeight: 900 }}>Erro</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{error}</div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div className="muted" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Status
            </div>
            <div style={{ marginTop: 10 }}>
              <StatusBadge>{campaign?.status ?? "—"}</StatusBadge>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="pillOutline" onClick={refresh} disabled={busy || loading}>
              Atualizar
            </button>
            <button
              type="button"
              className="pillOutline"
              disabled={busy || loading || !campaign}
              onClick={async () => {
                setBusy(true);
                try {
                  await generateCampaigns(id);
                  await refresh();
                } catch (err) {
                  setError(err?.message ? String(err.message) : "Falha ao gerar campanhas.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Gerar por país
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }} aria-label="Países alvo">
          {countryCodes.length ? (
            countryCodes.map((code) => (
              <span
                key={code}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid #e5e7eb",
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontWeight: 900,
                  color: "#111827",
                }}
              >
                <span aria-hidden="true">{countryCodeToFlag(code)}</span>
                {code}
              </span>
            ))
          ) : (
            <div className="muted" style={{ fontWeight: 800 }}>
              {loading ? "Carregando..." : "Nenhum país configurado."}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 18 }}>
        <div style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Campanhas geradas</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              {loading ? "Carregando..." : `${generated.length} item(ns)`}
            </div>
            {lastSync ? (
              <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
                Último sync: {lastSync}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
          <table className="dataTable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>País</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Meta Campaign ID</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {generated.map((gc) => (
                <tr key={gc.id}>
                  <td style={{ fontWeight: 900 }}>
                    <span style={{ marginRight: 10 }} aria-hidden="true">
                      {countryCodeToFlag(gc.country_code)}
                    </span>
                    {gc.country_code}
                  </td>
                  <td style={{ fontWeight: 900 }}>{gc.name}</td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {gc.status}
                  </td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {gc.meta_campaign_id || "—"}
                  </td>
                  <td>
                    {!gc.meta_campaign_id ? (
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                          value={metaIdDraftByGeneratedId[gc.id] ?? ""}
                          onChange={(e) =>
                            setMetaIdDraftByGeneratedId((prev) => ({
                              ...prev,
                              [gc.id]: e.target.value,
                            }))
                          }
                          placeholder="meta_campaign_id"
                          style={{
                            height: 36,
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                            padding: "0 12px",
                            fontSize: 13,
                            fontWeight: 700,
                            outline: "none",
                            background: "#ffffff",
                            minWidth: 200,
                          }}
                        />
                        <button
                          type="button"
                          className="pillOutline"
                          disabled={busy || loading || String(metaIdDraftByGeneratedId[gc.id] ?? "").trim() === ""}
                          onClick={async () => {
                            setBusy(true);
                            setError("");
                            try {
                              await markGeneratedPublished(gc.id, {
                                metaCampaignId: String(metaIdDraftByGeneratedId[gc.id]).trim(),
                              });
                              await refresh();
                            } catch (err) {
                              setError(
                                err?.message ? String(err.message) : "Falha ao vincular metaCampaignId."
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Vincular
                        </button>
                        <button
                          type="button"
                          className="pillOutline"
                          disabled={busy || loading}
                          onClick={async () => {
                            setBusy(true);
                            setError("");
                            try {
                              await markGeneratedPublished(gc.id, { metaCampaignId: `stub-${gc.id}` });
                              await refresh();
                            } catch (err) {
                              setError(
                                err?.message ? String(err.message) : "Falha ao marcar como publicada."
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Usar stub
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="pillOutline"
                        disabled={busy || loading}
                        onClick={async () => {
                          setBusy(true);
                          setError("");
                          try {
                            const res = await syncGeneratedCampaign(gc.id);
                            const inserted = res?.sync?.inserted ?? 0;
                            const updated = res?.sync?.updated ?? 0;
                            setLastSync(`${inserted} inseridos / ${updated} atualizados`);
                          } catch (err) {
                            setError(err?.message ? String(err.message) : "Falha ao sincronizar métricas.");
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Sync métricas
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!generated.length ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ fontWeight: 800 }}>
                    {loading ? "Carregando..." : "Nenhuma campanha gerada ainda. Clique em “Gerar por país”."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
