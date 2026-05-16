import CollapsibleCard from "./CollapsibleCard.jsx";

function okLabel(ok) {
  return ok ? "OK" : "—";
}

export default function AdRealAcceptanceCard({
  flowMode,
  created,
  selectedCreativeDraft,
  adCreativeId,
  isRealMetaId,
  normalizeNonEmptyString,
  onCopyEvidence,
}) {
  const isRealFlow = flowMode === "REAL";

  const creativeDraftId = normalizeNonEmptyString(selectedCreativeDraft?.id);
  const creativeDraftHasUrl = normalizeNonEmptyString(selectedCreativeDraft?.destination_url) !== "";
  const creativeDraftHasCta = normalizeNonEmptyString(selectedCreativeDraft?.cta_type) !== "";
  const creativeDraftHasAsset = normalizeNonEmptyString(selectedCreativeDraft?.creative_asset_id) !== "";

  const draftMetaCreativeId = normalizeNonEmptyString(selectedCreativeDraft?.meta_creative_id);
  const draftMetaCreativeIdIsReal = draftMetaCreativeId !== "" && isRealMetaId(draftMetaCreativeId);

  const effectiveCreativeId = normalizeNonEmptyString(adCreativeId) || draftMetaCreativeId;
  const effectiveCreativeIdIsReal = effectiveCreativeId !== "" && isRealMetaId(effectiveCreativeId);

  const metaAdId = normalizeNonEmptyString(created?.metaAd?.id);
  const metaAdIdIsReal = metaAdId !== "" && isRealMetaId(metaAdId);
  const metaAdEffectiveStatus = normalizeNonEmptyString(created?.metaAd?.effective_status);

  const checks = [
    { key: "draft", label: "Draft selecionado", ok: Boolean(creativeDraftId) },
    { key: "url", label: "Destination URL preenchida", ok: creativeDraftHasUrl },
    { key: "cta", label: "CTA definido (opcional)", ok: creativeDraftHasCta, optional: true },
    { key: "media", label: "Mídia vinculada (opcional)", ok: creativeDraftHasAsset, optional: true },
    {
      key: "creative",
      label: "Creative REAL publicado (meta_creative_id real)",
      ok: draftMetaCreativeIdIsReal,
      hidden: !isRealFlow,
    },
    {
      key: "creativeId",
      label: "`creativeId` disponível (id real)",
      ok: effectiveCreativeIdIsReal,
      hidden: !isRealFlow,
    },
    { key: "ad", label: "Ad REAL criado (meta_ad_id real)", ok: metaAdIdIsReal, hidden: !isRealFlow },
    {
      key: "paused",
      label: "Status PAUSED (Graph)",
      ok: metaAdEffectiveStatus === "PAUSED",
      hidden: !isRealFlow,
    },
  ].filter((c) => !c.hidden);

  const requiredChecks = checks.filter((c) => !c.optional);
  const optionalChecks = checks.filter((c) => c.optional);
  const requiredOk = requiredChecks.length ? requiredChecks.every((c) => c.ok) : false;

  return (
    <CollapsibleCard
      id="meta-test-p5-acceptance"
      title="P5 — Checklist (Ad REAL mínimo)"
      description="Guia operacional para validação (creative → ad → PAUSED). Não executa ações: apenas evidencia status."
      meta={requiredOk ? "OK" : "—"}
      defaultOpen={false}
      headerRight={
        <button type="button" className="pillOutline" onClick={onCopyEvidence}>
          Copiar evidência (JSON)
        </button>
      }
    >
      <div className="muted" style={{ fontWeight: 800, lineHeight: 1.55 }}>
        {isRealFlow ? (
          <>
            Objetivo: validar criação REAL de Ad como <b>PAUSED</b> sem expor token (Graph via backend).
          </>
        ) : (
          <>
            Fluxo atual está em <b>STUB</b>. Para validar P5 REAL, troque para <b>REAL</b> e garanta token no backend.
          </>
        )}
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            Requisitos (essenciais)
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {requiredChecks.map((c) => (
              <div key={c.key} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>{c.label}</div>
                <div className="muted" style={{ fontWeight: 900 }}>
                  {okLabel(c.ok)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {optionalChecks.length ? (
          <div className="card" style={{ padding: 12 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Itens opcionais (qualidade)
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {optionalChecks.map((c) => (
                <div key={c.key} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 900 }}>{c.label}</div>
                  <div className="muted" style={{ fontWeight: 900 }}>
                    {okLabel(c.ok)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="muted" style={{ marginTop: 12, fontWeight: 800 }}>
        Dica: após criar o Ad REAL, use “Graph refresh → Consultar Ad no Graph” para evidenciar `effective_status=PAUSED`.
      </div>
    </CollapsibleCard>
  );
}

