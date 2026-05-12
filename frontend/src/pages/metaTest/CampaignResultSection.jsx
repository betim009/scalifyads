import StatusBadge from "../../components/StatusBadge.jsx";

export default function CampaignResultSection({
  created,
  createdCountryCode,
  countryCodeToFlag,
}) {
  return (
    <div className="card" style={{ padding: 18, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Resultado</div>
        <div className="muted" style={{ fontWeight: 900 }}>
          Modo: <span style={{ fontWeight: 900 }}>{created?.mode || "—"}</span>
        </div>
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
          <div className="muted" style={{ fontWeight: 900 }}>
            Meta Campaign ID
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>{created?.metaCampaign?.id || "—"}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            País
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {createdCountryCode ? `${countryCodeToFlag(createdCountryCode)} ${createdCountryCode}` : "—"}
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            Status
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusBadge>{created?.metaCampaign?.status || "—"}</StatusBadge>
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            Effective Status
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusBadge>{created?.metaCampaign?.effective_status || "—"}</StatusBadge>
          </div>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 12, fontWeight: 800 }}>
        Persistência local:
        <div style={{ marginTop: 6 }}>
          `generated_campaigns.id`: <b>{created?.generatedCampaign?.id || "—"}</b>
        </div>
        <div style={{ marginTop: 6 }}>
          `generated_campaigns.meta_campaign_id`: <b>{created?.generatedCampaign?.meta_campaign_id || "—"}</b>
        </div>
        <div style={{ marginTop: 6 }}>
          `generated_campaigns.meta_adset_id`: <b>{created?.generatedCampaign?.meta_adset_id || "—"}</b>
        </div>
        <div style={{ marginTop: 6 }}>
          `generated_campaigns.meta_ad_id`: <b>{created?.generatedCampaign?.meta_ad_id || "—"}</b>
        </div>
      </div>
    </div>
  );
}
