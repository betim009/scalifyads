import StatusBadge from "./StatusBadge.jsx";
import { BarChartIcon, LanguageIcon, PlayArrowIcon } from "../styles/icons.js";

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
      </div>

      <div className="campaignMetaRow">
        <LanguageIcon fontSize="small" style={{ opacity: 0.75 }} />
        <span>{scopeLabel}</span>
        <span aria-hidden="true">·</span>
        <BarChartIcon fontSize="small" style={{ opacity: 0.75 }} />
        <span>{generatedLabel}</span>
        <span aria-hidden="true">·</span>
        <PlayArrowIcon fontSize="small" style={{ opacity: 0.75 }} />
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
