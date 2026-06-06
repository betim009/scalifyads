import { useState } from "react";
import JsonAccordion from "./JsonAccordion.jsx";
import { generateCampaignTemplateTranslationsByMarket } from "../../services/campaignTemplates.js";
import { OPERATIONAL_MARKETS } from "../../utils/operationalMarkets.js";

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getAdVariantsCount(payload) {
  const variants = Array.isArray(payload?.adVariants) ? payload.adVariants : [];
  return variants.length;
}

function getTranslationsByMarket(payload) {
  return normalizeObject(payload?.translationsByMarket);
}

function findMarket(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return OPERATIONAL_MARKETS.find((market) => market.code === normalized) ?? null;
}

function MarketTranslationRow({ marketCode, entry, expanded, onToggle }) {
  const market = findMarket(marketCode);
  const variants = Array.isArray(entry?.adVariants) ? entry.adVariants : [];

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>{marketCode}</div>
        <div>
          <div style={{ fontWeight: 900 }}>{market?.name ?? "Mercado"}</div>
          <div className="muted" style={{ fontWeight: 800, marginTop: 3 }}>{market?.language ?? "Idioma não informado"}</div>
        </div>
        <div className="muted" style={{ fontWeight: 850 }}>{variants.length} adVariant(s)</div>
        <button type="button" className="pillOutline" onClick={onToggle} style={{ height: 34, padding: "0 12px" }}>
          {expanded ? "Recolher" : "Ver textos"}
        </button>
      </div>

      {expanded ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {variants.length ? (
            variants.map((variant, idx) => (
              <div key={`${marketCode}-${idx}`} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 950 }}>Ad {idx + 1}</div>
                <div>
                  <div className="muted" style={{ fontWeight: 850 }}>primaryText</div>
                  <div style={{ marginTop: 3, whiteSpace: "pre-wrap", fontWeight: 750 }}>{variant?.primaryText || "—"}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontWeight: 850 }}>headline</div>
                  <div style={{ marginTop: 3, whiteSpace: "pre-wrap", fontWeight: 750 }}>{variant?.headline || "—"}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontWeight: 850 }}>description</div>
                  <div style={{ marginTop: 3, whiteSpace: "pre-wrap", fontWeight: 750 }}>{variant?.description || "—"}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="muted" style={{ fontWeight: 800 }}>Sem adVariants traduzidos.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TemplateMarketTranslationsPanel({ template, busy, onUpdated }) {
  const [marketQuery, setMarketQuery] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState(["ARM", "AREU", "ENCA", "ENAU"]);
  const [overwrite, setOverwrite] = useState(false);
  const [expandedMarket, setExpandedMarket] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const payload = normalizeObject(template?.payload);
  const translationsByMarket = getTranslationsByMarket(payload);
  const translatedMarketCodes = Object.keys(translationsByMarket).sort();
  const adVariantsCount = getAdVariantsCount(payload);
  const q = String(marketQuery || "").trim().toLowerCase();
  const visibleMarkets = OPERATIONAL_MARKETS.filter((market) => {
    if (!q) return true;
    return `${market.code} ${market.name} ${market.language}`.toLowerCase().includes(q);
  });
  const selectedSet = new Set(selectedMarkets);
  const canGenerate = Boolean(template?.id) && selectedMarkets.length > 0 && adVariantsCount > 0 && !busy && !localBusy;

  function toggleMarket(code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) return;
    setSelectedMarkets((prev) => {
      const current = new Set(Array.isArray(prev) ? prev : []);
      if (current.has(normalized)) current.delete(normalized);
      else current.add(normalized);
      return Array.from(current).sort();
    });
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setNotice("");
    setError("");
    setLocalBusy(true);
    try {
      const res = await generateCampaignTemplateTranslationsByMarket(template.id, {
        markets: selectedMarkets,
        overwrite,
      });
      setNotice(
        `Traduções geradas: ${res.generated.length}. Preservadas: ${res.preserved.length}.`
      );
      if (typeof onUpdated === "function") await onUpdated(res.campaignTemplate);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao gerar traduções por mercado.");
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <div className="card" style={{ padding: 12, marginTop: 12, borderColor: "#bfdbfe" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950 }}>Traduções por Mercado</div>
          <div className="muted" style={{ marginTop: 5, fontWeight: 800 }}>
            Traduções armazenadas localmente. Nenhum conteúdo foi publicado na Meta.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pillOutline" style={{ display: "inline-flex", alignItems: "center", height: 34, cursor: "default" }}>
            Base: {adVariantsCount} adVariant(s)
          </span>
          <span className="pillOutline" style={{ display: "inline-flex", alignItems: "center", height: 34, cursor: "default" }}>
            Traduções existentes: {translatedMarketCodes.length}
          </span>
        </div>
      </div>

      {(notice || error) ? (
        <div
          className="card"
          style={{
            marginTop: 12,
            padding: 10,
            borderColor: error ? "#fecaca" : "#bfdbfe",
            color: error ? "#991b1b" : "#1d4ed8",
            fontWeight: 900,
          }}
        >
          {error || notice}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <input
          value={marketQuery}
          onChange={(e) => setMarketQuery(e.target.value)}
          placeholder="Buscar mercado por código, nome ou idioma"
          disabled={busy || localBusy}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              disabled={busy || localBusy}
            />
            Sobrescrever traduções existentes
          </label>
          <button
            type="button"
            className="pillOutline"
            disabled={busy || localBusy}
            onClick={() => setSelectedMarkets(["ARM", "AREU", "ENCA", "ENAU"])}
          >
            Seleção padrão
          </button>
          <button
            type="button"
            className="pillOutline"
            disabled={busy || localBusy || selectedMarkets.length === 0}
            onClick={() => setSelectedMarkets([])}
          >
            Limpar seleção
          </button>
          <button
            type="button"
            className="pillOutline"
            disabled={busy || localBusy || translatedMarketCodes.length === 0}
            onClick={() => setExpandedMarket(expandedMarket ? "" : translatedMarketCodes[0])}
          >
            {expandedMarket ? "Recolher textos" : "Expandir primeiro"}
          </button>
        </div>

        <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8 }}>
            {visibleMarkets.map((market) => (
              <label
                key={market.code}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: 8,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  background: selectedSet.has(market.code) ? "#eff6ff" : "#fff",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedSet.has(market.code)}
                  onChange={() => toggleMarket(market.code)}
                  disabled={busy || localBusy}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <span style={{ display: "block", fontWeight: 950 }}>{market.code}</span>
                  <span className="muted" style={{ display: "block", fontWeight: 800 }}>{market.name}</span>
                  <span className="muted" style={{ display: "block", fontWeight: 750 }}>{market.language}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <button type="button" className="pillOutline" disabled={!canGenerate} onClick={handleGenerate}>
          {localBusy ? "Gerando traduções..." : `Gerar Traduções (${selectedMarkets.length})`}
        </button>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 950 }}>Traduções existentes</div>
        {translatedMarketCodes.length ? (
          translatedMarketCodes.map((marketCode) => (
            <MarketTranslationRow
              key={marketCode}
              marketCode={marketCode}
              entry={translationsByMarket[marketCode]}
              expanded={expandedMarket === marketCode}
              onToggle={() => setExpandedMarket((current) => (current === marketCode ? "" : marketCode))}
            />
          ))
        ) : (
          <div className="muted" style={{ fontWeight: 800 }}>Nenhum mercado traduzido neste template.</div>
        )}
      </div>
    </div>
  );
}

export default function CampaignTemplatesSection({
  generatedCampaignId,
  loading,
  error,
  errorDetails,
  templates,
  refreshDisabled,
  createFromGeneratedDisabled,
  createFromGeneratedLoading,
  deleteDisabled,
  deleteLoadingId,
  applyDisabled,
  applyLoadingId,
  onRefresh,
  onCreateFromGenerated,
  onApply,
  onDelete,
  onDismissError,
  safeJson,
}) {
  const [nameOverride, setNameOverride] = useState("");

  return (
    <div id="meta-test-campaign-templates" className="card" style={{ padding: 0, marginTop: 16 }}>
      <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Campaign Templates (DB)</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Salva a estrutura base (Campaign → AdSet → Ad) a partir de uma `generated_campaign`.
          </div>
        </div>
        <button type="button" className="pillOutline" onClick={onRefresh} disabled={refreshDisabled}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900 }}>Criar a partir do selecionado</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Requer DB e um registro selecionado em `generated_campaigns`.
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <input
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              placeholder="Nome do template (opcional)"
              disabled={createFromGeneratedDisabled || createFromGeneratedLoading || !generatedCampaignId}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="pillOutline"
                disabled={createFromGeneratedDisabled || createFromGeneratedLoading || !generatedCampaignId}
                onClick={async () => {
                  await onCreateFromGenerated?.({
                    name: String(nameOverride || "").trim() || null,
                  });
                  setNameOverride("");
                }}
              >
                {createFromGeneratedLoading ? "Salvando..." : "Salvar template"}
              </button>
              <button
                type="button"
                className="pillOutline"
                disabled={createFromGeneratedDisabled || createFromGeneratedLoading || !nameOverride}
                onClick={() => setNameOverride("")}
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: 14, margin: "0 16px 16px", borderColor: "#fecaca", color: "#991b1b" }}>
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
          <JsonAccordion title="Detalhes" value={errorDetails} safeJson={safeJson} />
        </div>
      ) : null}

      <div style={{ padding: "0 16px 16px" }}>
        {templates?.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {templates.slice(0, 50).map((t) => (
              <div key={t.id} className="card" style={{ padding: 12 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900 }}>{t.name || "template"}</div>
                  <div className="muted" style={{ fontWeight: 800 }}>
                    {t.created_at ? String(t.created_at).slice(0, 19).replace("T", " ") : "—"}
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="pillOutline"
                    disabled={applyDisabled || !t?.id || applyLoadingId === t.id}
                    onClick={() => onApply?.(t)}
                  >
                    {applyLoadingId === t.id ? "Aplicando..." : "Aplicar (criar no DB)"}
                  </button>
                  <button
                    type="button"
                    className="pillOutline"
                    disabled={deleteDisabled || !t?.id || deleteLoadingId === t.id}
                    onClick={() => onDelete?.(t)}
                  >
                    {deleteLoadingId === t.id ? "Removendo..." : "Remover"}
                  </button>
                </div>
                <TemplateMarketTranslationsPanel
                  template={t}
                  busy={refreshDisabled || applyDisabled || deleteDisabled}
                  onUpdated={async () => {
                    await onRefresh?.();
                  }}
                />
                <JsonAccordion title="Payload" value={t.payload} safeJson={safeJson} />
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ fontWeight: 800 }}>
            Vazio.
          </div>
        )}
      </div>
    </div>
  );
}
