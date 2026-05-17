export default function MetaStructureCard({
  created,
  campaignEntityModeLabel,
  adSetEntityModeLabel,
  adEntityModeLabel,
  countryCode,
  countryNameByCode,
}) {
  return (
    <div className="card" style={{ padding: 18, marginTop: 16 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>Estrutura Meta (Campaign → AdSet → Ad)</div>
      <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
        Esta tela evita “formulário gigante” e evolui progressivamente por entidade.
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Campaign (Meta)
            </div>
            <span className="muted" style={{ fontWeight: 900 }}>
              {campaignEntityModeLabel}
            </span>
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>{created?.metaCampaign?.id ?? "—"}</div>
          <div className="muted" style={{ marginTop: 8, fontWeight: 900 }}>
            {(created?.metaCampaign?.status ?? "—") + " / " + (created?.metaCampaign?.effective_status ?? "—")}
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              AdSet (Meta)
            </div>
            <span className="muted" style={{ fontWeight: 900 }}>
              {adSetEntityModeLabel}
            </span>
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {created?.metaAdSet?.id ?? created?.generatedCampaign?.meta_adset_id ?? "—"}
          </div>
          <div className="muted" style={{ marginTop: 8, fontWeight: 900 }}>
            {(created?.metaAdSet?.status ?? created?.generatedCampaign?.meta_adset_status ?? "—") +
              " / " +
              (created?.metaAdSet?.effective_status ?? created?.generatedCampaign?.meta_adset_effective_status ?? "—")}
          </div>
          {!created?.generatedCampaign?.meta_adset_id ? (
            <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
              Targeting (país/posicionamentos) + budget
            </div>
          ) : null}
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Ad (Meta)
            </div>
            <span className="muted" style={{ fontWeight: 900 }}>
              {adEntityModeLabel}
            </span>
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>{created?.metaAd?.id ?? created?.generatedCampaign?.meta_ad_id ?? "—"}</div>
          <div className="muted" style={{ marginTop: 8, fontWeight: 900 }}>
            {(created?.metaAd?.status ?? created?.generatedCampaign?.meta_ad_status ?? "—") +
              " / " +
              (created?.metaAd?.effective_status ?? created?.generatedCampaign?.meta_ad_effective_status ?? "—")}
          </div>
          {created?.metaAdCreate?.creativeIdSource ? (
            <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
              creativeId source: <b>{String(created.metaAdCreate.creativeIdSource)}</b>
            </div>
          ) : null}
          {!created?.generatedCampaign?.meta_ad_id ? (
            <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
              Creative (sem upload complexo)
            </div>
          ) : null}
        </div>
      </div>

      <div className="muted" style={{ marginTop: 12, fontWeight: 800 }}>
        País (modelo operacional local): <b>{countryCode || "—"}</b>
        {countryCode && countryNameByCode?.[countryCode] ? ` — ${countryNameByCode[countryCode]}` : ""}
      </div>
    </div>
  );
}
