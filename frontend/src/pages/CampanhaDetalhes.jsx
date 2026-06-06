import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/PageShell.jsx";
import { Fragment, useEffect, useMemo, useState } from "react";
import { getCampaign, generateCampaigns } from "../services/campaigns.js";
import { listGeneratedCampaigns, listOperationalMarketsForCampaign, markGeneratedPublished } from "../services/generatedCampaigns.js";
import { getGeneratedCampaignStructure, listGeneratedCampaignEvents } from "../services/generatedCampaigns.js";
import { countryCodeToFlag } from "../services/fallbacks.js";
import StatusBadge from "../components/StatusBadge.jsx";
import StatusPill from "../components/StatusPill.jsx";
import AdvancedDisclosure from "../components/AdvancedDisclosure.jsx";
import { syncGeneratedCampaign } from "../services/meta.js";
import { HttpError } from "../services/http.js";

export default function CampanhaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [generated, setGenerated] = useState([]);
  const [operationalMarkets, setOperationalMarkets] = useState([]);
  const [expandedOperationalMarkets, setExpandedOperationalMarkets] = useState({});
  const [generatedOnly, setGeneratedOnly] = useState(false);
  const [generatedStructure, setGeneratedStructure] = useState({ adSets: [], ads: [] });
  const [generatedEvents, setGeneratedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [metaIdDraftByGeneratedId, setMetaIdDraftByGeneratedId] = useState({});

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setGeneratedOnly(false);
      const [campaignRes, generatedRes, operationalRes] = await Promise.all([
        getCampaign(id),
        listGeneratedCampaigns({ campaignId: id }),
        listOperationalMarketsForCampaign(id).catch(() => ({ operationalMarkets: [] })),
      ]);
      setCampaign(campaignRes.campaign);
      setGenerated(generatedRes.generatedCampaigns ?? []);
      setOperationalMarkets(operationalRes.operationalMarkets ?? []);
      setExpandedOperationalMarkets({});
      setGeneratedStructure({ adSets: [], ads: [] });
      setGeneratedEvents([]);
    } catch (err) {
      const isNotFound = err instanceof HttpError && err.status === 404;
      if (isNotFound) {
        try {
          setGeneratedOnly(true);
          setCampaign(null);
          setGenerated([]);
          setOperationalMarkets([]);
          setExpandedOperationalMarkets({});
          const [structureRes, eventsRes] = await Promise.all([
            getGeneratedCampaignStructure(id),
            listGeneratedCampaignEvents(id, { limit: 50 }),
          ]);
          setGeneratedStructure({
            adSets: Array.isArray(structureRes?.generatedAdSets) ? structureRes.generatedAdSets : [],
            ads: Array.isArray(structureRes?.generatedAds) ? structureRes.generatedAds : [],
          });
          setGeneratedEvents(Array.isArray(eventsRes?.generatedCampaignEvents) ? eventsRes.generatedCampaignEvents : []);
        } catch (err2) {
          setError(err2?.message ? String(err2.message) : "Falha ao carregar detalhes da execução.");
        }
      } else {
        setError(err?.message ? String(err.message) : "Falha ao carregar campanha.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [id]);

  const countryCodes = useMemo(() => campaign?.countryCodes ?? [], [campaign]);
  const safeJson = (value) => JSON.stringify(value ?? null, null, 2);

	  return (
	    <PageShell
	      title={generatedOnly ? "Detalhes da execução" : "Detalhes da campanha"}
	      subtitle={generatedOnly ? `ID ${String(id || "")}` : campaign ? campaign.name : "Campanha"}
	      backFallbackTo={generatedOnly ? "/campaign-flow" : "/mensal"}
	    >
	      <div className="card" style={{ padding: 16, borderColor: "#fde68a", background: "#fffbeb" }}>
	        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
	          <div style={{ display: "grid", gap: 6 }}>
	            <div style={{ fontWeight: 950, color: "#92400e" }}>Guardrail</div>
	            <div style={{ fontWeight: 800, color: "#92400e", fontSize: 13 }}>
	              Campanhas/anúncios reais permanecem PAUSED. Ações reais exigem confirmação.
	            </div>
	          </div>
	          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
	            <StatusPill tone="warn">REAL = PAUSED</StatusPill>
	            <StatusPill tone="muted">Nunca ACTIVE</StatusPill>
	          </div>
	        </div>
	      </div>

	      {error ? (
	        <div className="card" style={{ padding: 18, borderColor: "#fecaca", color: "#991b1b" }}>
	          <div style={{ fontWeight: 900 }}>Erro</div>
	          <div style={{ marginTop: 6, fontWeight: 700 }}>{error}</div>
	        </div>
	      ) : null}

	      {generatedOnly ? (
	        <div className="card" style={{ padding: 22, marginTop: 14 }}>
	          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
	            <div style={{ display: "grid", gap: 6 }}>
	              <div style={{ fontWeight: 950 }}>Resumo</div>
	              <div className="muted" style={{ fontWeight: 850, fontSize: 12 }}>
	                Visual operacional. Detalhes técnicos ficam em “Diagnóstico”.
	              </div>
	            </div>
	            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
	              <StatusPill tone="info">REAL</StatusPill>
	              <StatusPill tone="warn">PAUSED</StatusPill>
	            </div>
	          </div>

	          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
	            <span className="monoTag">AdSets: {(generatedStructure.adSets || []).length}</span>
	            <span className="monoTag">Ads: {(generatedStructure.ads || []).length}</span>
	          </div>

	          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
	            <button type="button" className="pillOutline" onClick={refresh} disabled={busy || loading}>
	              Atualizar
	            </button>
	            <button
	              type="button"
	              className="pillOutline"
	              disabled={busy || loading}
	              onClick={async () => {
	                setBusy(true);
	                setError("");
	                try {
	                  const res = await syncGeneratedCampaign(id);
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
	              Sincronizar métricas
	            </button>
	            <button
	              type="button"
	              className="pillOutline"
	              disabled={busy || loading}
	              onClick={() => {
	                const params = new URLSearchParams();
	                params.set("generatedCampaignId", String(id));
	                navigate(`/meta-test?${params.toString()}`);
	              }}
	            >
	              Abrir diagnóstico técnico
	            </button>
	          </div>

	          {lastSync ? (
	            <div className="card" style={{ padding: 14, marginTop: 14, borderColor: "#bfdbfe", color: "#1d4ed8" }}>
	              <div style={{ fontWeight: 900 }}>{lastSync}</div>
	            </div>
	          ) : null}

	          <AdvancedDisclosure summary="Detalhes técnicos (eventos)" defaultOpen={false}>
	            <div style={{ display: "grid", gap: 10 }}>
	              {(generatedEvents || []).length ? (
	                (generatedEvents || []).map((e, idx) => (
	                  <div key={e.id || e.client_at || String(idx)} className="card" style={{ padding: 12 }}>
	                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
	                      <div style={{ fontWeight: 900 }}>{e.action || "evento"}</div>
	                      <span className="monoTag">{e.client_at || e.created_at || "—"}</span>
	                    </div>
	                    {e.note ? (
	                      <div className="muted" style={{ marginTop: 6, fontWeight: 800, fontSize: 12 }}>
	                        {e.note}
	                      </div>
	                    ) : null}
	                  </div>
	                ))
	              ) : (
	                <div className="muted" style={{ fontWeight: 800 }}>
	                  {loading ? "Carregando..." : "Sem eventos recentes."}
	                </div>
	              )}
	            </div>
	          </AdvancedDisclosure>
	        </div>
	      ) : null}

	      {!generatedOnly ? (
	        <>
	          <div className="card" style={{ padding: 22, marginTop: 14 }}>
	            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
	              <div style={{ display: "grid", gap: 8 }}>
	                <div className="muted" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>
	                  Status
	                </div>
	                <div>
	                  <StatusBadge>{campaign?.status ?? "—"}</StatusBadge>
	                </div>
	              </div>
	              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
	                <button type="button" className="pillOutline" onClick={refresh} disabled={busy || loading}>
	                  Atualizar
	                </button>
	                <button
	                  type="button"
	                  className="pillOutline"
	                  disabled={busy || loading || !campaign}
	                  onClick={() => navigate(`/nova-campanha?draft=${encodeURIComponent(String(id))}`)}
	                >
	                  Editar rascunho
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

	            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }} aria-label="Países alvo">
	              {countryCodes.length ? (
	                countryCodes.map((code) => (
	                  <span key={code} className="monoTag">
	                    <span aria-hidden="true" style={{ marginRight: 8 }}>
	                      {countryCodeToFlag(code)}
	                    </span>
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
	            <div style={{ padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
	              <div>
	                <div style={{ fontWeight: 900, fontSize: 18 }}>Mercados Operacionais</div>
	                <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
	                  {loading ? "Carregando..." : `${operationalMarkets.length} item(ns)`}
	                </div>
	              </div>
	              <StatusPill tone="muted">Preview only</StatusPill>
	            </div>

	            <div style={{ padding: "0 18px 16px" }}>
	              <div style={{ padding: 14, border: "1px solid #bfdbfe", borderRadius: 8, color: "#1d4ed8", background: "#eff6ff" }}>
	                <div style={{ fontWeight: 900 }}>Pré-visualização operacional.</div>
	                <div style={{ marginTop: 4, fontWeight: 800, fontSize: 13 }}>
	                  Nenhum objeto foi publicado na Meta.
	                </div>
	              </div>
	            </div>

	            <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
	              <table className="dataTable" style={{ marginTop: 0 }}>
	                <thead>
	                  <tr>
	                    <th>Mercado</th>
	                    <th>Nome gerado</th>
	                    <th>UTM</th>
	                    <th>Status</th>
	                    <th>Detalhes</th>
	                  </tr>
	                </thead>
	                <tbody>
	                  {operationalMarkets.map((market) => {
	                    const isOpen = Boolean(expandedOperationalMarkets[market.id || market.marketCode]);
	                    const rowKey = market.id || market.marketCode;
	                    return (
	                      <Fragment key={rowKey}>
	                        <tr key={rowKey}>
	                          <td style={{ fontWeight: 900 }}>
	                            <div style={{ display: "grid", gap: 4 }}>
	                              <span className="monoTag">{market.marketCode || "—"}</span>
	                              <span className="muted" style={{ fontWeight: 800, fontSize: 12 }}>
	                                {market.marketName || "—"}
	                              </span>
	                            </div>
	                          </td>
	                          <td>
	                            <span className="monoTag">{market.marketParam || "—"}</span>
	                          </td>
	                          <td>
	                            <span className="monoTag">{market.utmCampaign || "—"}</span>
	                          </td>
	                          <td>
	                            <StatusPill tone={market.status === "PAUSED" ? "warn" : "muted"}>
	                              {market.status || "—"}
	                            </StatusPill>
	                          </td>
	                          <td>
	                            <button
	                              type="button"
	                              className="pillOutline"
	                              onClick={() =>
	                                setExpandedOperationalMarkets((prev) => ({
	                                  ...prev,
	                                  [rowKey]: !prev[rowKey],
	                                }))
	                              }
	                            >
	                              {isOpen ? "Recolher" : "Expandir"}
	                            </button>
	                          </td>
	                        </tr>
	                        {isOpen ? (
	                          <tr key={`${rowKey}-details`}>
	                            <td colSpan={5}>
	                              <div style={{ display: "grid", gap: 12, padding: "8px 0" }}>
	                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
		                                  <span className="monoTag">Código: {market.marketCode || "—"}</span>
		                                  <span className="monoTag">Mercado: {market.marketName || "—"}</span>
		                                  <span className="monoTag">Nome gerado: {market.marketParam || "—"}</span>
		                                  <span className="monoTag">UTM: {market.utmCampaign || "—"}</span>
		                                  <span className="monoTag">src: {market.src || "—"}</span>
		                                  <span className="monoTag">
		                                    Países resolvidos: {(market.resolvedCountries || []).length}
		                                  </span>
		                                  <span className="monoTag">Publicação Meta: {market.publishable ? "liberada" : "não liberada"}</span>
		                                  <span className="monoTag">Modo: {market.previewOnly ? "pré-visualização" : "operacional"}</span>
		                                </div>
		                                <div style={{ display: "grid", gap: 10 }}>
		                                  <AdvancedDisclosure summary="Países resolvidos" defaultOpen={false}>
		                                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
		                                      {safeJson(market.resolvedCountries || [])}
		                                    </pre>
		                                  </AdvancedDisclosure>
		                                  <AdvancedDisclosure summary="Detalhes técnicos do targeting" defaultOpen={false}>
	                                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
	                                      {safeJson(market.targetingPreview || {})}
	                                    </pre>
	                                  </AdvancedDisclosure>
	                                </div>
	                              </div>
	                            </td>
	                          </tr>
	                        ) : null}
	                      </Fragment>
	                    );
	                  })}
	                  {!operationalMarkets.length ? (
	                    <tr>
	                      <td colSpan={5} className="muted" style={{ fontWeight: 800 }}>
	                        {loading ? "Carregando..." : "Nenhum mercado operacional persistido para esta campanha."}
	                      </td>
	                    </tr>
	                  ) : null}
	                </tbody>
	              </table>
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
	                    Última sincronização: {lastSync}
	                  </div>
	                ) : null}
	              </div>
	            </div>

	            <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
	              <table className="dataTable" style={{ marginTop: 0 }}>
	                <thead>
	                  <tr>
	                    <th>País</th>
	                    <th>Status</th>
	                    <th>Modo</th>
	                    <th>Meta Campaign</th>
	                    <th>Status Meta</th>
	                    <th>Ações</th>
	                  </tr>
	                </thead>
	                <tbody>
	                  {generated.map((gc) => {
	                    const isStub = String(gc.meta_campaign_id || "").startsWith("stub-") || !gc.meta_campaign_id;
	                    const metaStatus = gc.meta_status || gc.meta_effective_status || null;
	                    const metaStatusLabel =
	                      gc.meta_status || gc.meta_effective_status
	                        ? `${gc.meta_status || "—"}${
	                            gc.meta_effective_status && gc.meta_effective_status !== gc.meta_status
	                              ? ` / ${gc.meta_effective_status}`
	                              : ""
	                          }`
	                        : "—";
	                    return (
	                      <tr key={gc.id}>
	                        <td style={{ fontWeight: 900 }}>
	                          <span style={{ marginRight: 10 }} aria-hidden="true">
	                            {countryCodeToFlag(gc.country_code)}
	                          </span>
	                          <span className="monoTag">{gc.country_code}</span>
	                        </td>
	                        <td>
	                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
	                            <StatusPill tone={String(gc.status || "").toLowerCase().includes("erro") ? "bad" : "muted"}>
	                              {gc.status || "—"}
	                            </StatusPill>
	                            {!isStub ? <StatusPill tone="warn">PAUSED</StatusPill> : <StatusPill tone="muted">SIMULADO</StatusPill>}
	                          </div>
	                        </td>
	                        <td>
	                          <StatusPill tone={isStub ? "muted" : "info"}>{isStub ? "STUB" : "REAL"}</StatusPill>
	                        </td>
	                        <td>{gc.meta_campaign_id ? <span className="monoTag">{gc.meta_campaign_id}</span> : "—"}</td>
	                        <td>{metaStatus ? <span className="monoTag">{metaStatusLabel}</span> : "—"}</td>
	                        <td>
	                          {!gc.meta_campaign_id || String(gc.meta_campaign_id).startsWith("stub-") ? (
	                            <div style={{ display: "grid", gap: 10 }}>
	                              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
	                                <button
	                                  type="button"
	                                  className="pillOutline"
	                                  disabled={busy || loading}
	                                  onClick={() => {
	                                    const params = new URLSearchParams();
	                                    params.set("generatedCampaignId", String(gc.id));
	                                    params.set("name", String(gc.name || ""));
	                                    navigate(`/meta-test?${params.toString()}`);
	                                  }}
	                                >
	                                  Abrir diagnóstico técnico
	                                </button>
	                              </div>

	                              <AdvancedDisclosure summary="Compatibilidade (legado)" defaultOpen={false}>
	                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
	                                  <input
	                                    value={metaIdDraftByGeneratedId[gc.id] ?? ""}
	                                    onChange={(e) =>
	                                      setMetaIdDraftByGeneratedId((prev) => ({
	                                        ...prev,
	                                        [gc.id]: e.target.value,
	                                      }))
	                                    }
	                                    placeholder="Meta Campaign ID"
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
	                                        setError(err?.message ? String(err.message) : "Falha ao vincular Meta Campaign ID.");
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
	                                        setError(err?.message ? String(err.message) : "Falha ao marcar como publicada.");
	                                      } finally {
	                                        setBusy(false);
	                                      }
	                                    }}
	                                  >
	                                    Usar stub
	                                  </button>
	                                </div>
	                              </AdvancedDisclosure>
	                            </div>
	                          ) : (
	                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
	                                    const provider = res?.sync?.provider ?? "—";
	                                    const fallback = res?.sync?.fallback ?? null;
	                                    const fallbackNote = fallback?.reason ? ` (fallback: ${fallback.reason})` : fallback ? " (fallback)" : "";
	                                    setLastSync(`${inserted} inseridos / ${updated} atualizados — provider: ${provider}${fallbackNote}`);
	                                  } catch (err) {
	                                    setError(err?.message ? String(err.message) : "Falha ao sincronizar métricas.");
	                                  } finally {
	                                    setBusy(false);
	                                  }
	                                }}
	                              >
	                                Sincronizar métricas
	                              </button>
	                              <button
	                                type="button"
	                                className="pillOutline"
	                                disabled={busy || loading}
	                                onClick={() => {
	                                  const params = new URLSearchParams();
	                                  params.set("generatedCampaignId", String(gc.id));
	                                  params.set("name", String(gc.name || ""));
	                                  navigate(`/meta-test?${params.toString()}`);
	                                }}
	                              >
	                                Abrir diagnóstico técnico
	                              </button>
	                            </div>
	                          )}
	                        </td>
	                      </tr>
	                    );
	                  })}
	                  {!generated.length ? (
	                    <tr>
	                      <td colSpan={6} className="muted" style={{ fontWeight: 800 }}>
	                        {loading ? "Carregando..." : "Nenhuma campanha gerada ainda. Clique em “Gerar por país”."}
	                      </td>
	                    </tr>
	                  ) : null}
	                </tbody>
	              </table>
	            </div>
	          </div>
	        </>
	      ) : null}
    </PageShell>
  );
}
