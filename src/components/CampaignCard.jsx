import StatusBadge from "./StatusBadge.jsx";

export default function CampaignCard({
  name,
  status,
  scopeLabel,
  generatedLabel,
  createdAtLabel,
  countryFlags,
}) {
  return (
    <div className="card campaignCard">
      <div className="campaignTopRow">
        <div className="campaignNameRow">
          <h3 className="campaignName">{name}</h3>
          <StatusBadge>{status}</StatusBadge>
        </div>
        <div className="campaignActions">
          <button type="button" className="pillOutline">
            Ver Detalhes
          </button>
          <button type="button" className="pillOutline">
            Duplicar
          </button>
        </div>
      </div>

      <div className="campaignMetaRow">
        <span aria-hidden="true">🌐</span>
        <span>{scopeLabel}</span>
        <span aria-hidden="true">·</span>
        <span aria-hidden="true">📊</span>
        <span>{generatedLabel}</span>
        <span aria-hidden="true">·</span>
        <span aria-hidden="true">▶</span>
        <span>{createdAtLabel}</span>
      </div>

      <div className="campaignFlags" aria-label="Países">
        {countryFlags.map((flag) => (
          <span key={flag} aria-hidden="true">
            {flag}
          </span>
        ))}
      </div>
    </div>
  );
}

