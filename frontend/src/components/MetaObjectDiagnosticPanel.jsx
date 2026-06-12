import { useEffect, useState } from "react";
import StatusPill from "./StatusPill.jsx";
import AdvancedDisclosure from "./AdvancedDisclosure.jsx";
import { getMetaObjectDiagnostic } from "../services/metaDiagnostics.js";

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeJson(value) {
  return JSON.stringify(value ?? null, null, 2);
}

function labelForType(type) {
  return {
    campaign: "Campaign",
    adset: "AdSet",
    creative: "Creative",
    ad: "Ad",
  }[String(type || "").toLowerCase()] || "Objeto Meta";
}

function statusTone(status) {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE") return "good";
  if (value === "PAUSED") return "info";
  if (!value) return "muted";
  return "warn";
}

export default function MetaObjectDiagnosticPanel({ type, id, metaAccountId, autoLoad = false }) {
  const [diagnostic, setDiagnostic] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getMetaObjectDiagnostic(type, id, { metaAccountId });
      setDiagnostic(data);
    } catch (err) {
      const body = normalizeObject(err?.body);
      const metaError = normalizeObject(body?.error);
      const details = normalizeObject(metaError.details);
      setError(
        [
          metaError.message || err?.message || "Falha ao consultar objeto Meta.",
          details.code ? `code: ${details.code}` : "",
          details.subcode ? `subcode: ${details.subcode}` : "",
          details.suggestion || "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoLoad && id && !diagnostic && !loading && !error) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, id, type, metaAccountId]);

  const summary = normalizeObject(diagnostic?.summary);
  const alerts = Array.isArray(diagnostic?.alerts) ? diagnostic.alerts : [];
  const media = normalizeObject(summary.media);
  const hasId = Boolean(String(id || "").trim());

  return (
    <div className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950 }}>{labelForType(type)}</div>
          <div className="monoTag" style={{ marginTop: 4 }}>{hasId ? id : "ID ausente"}</div>
        </div>
        <button type="button" className="templatesBtnOutline" disabled={!hasId || loading} onClick={load}>
          {loading ? "Consultando..." : "Diagnosticar"}
        </button>
      </div>

      {error ? <div className="templatesHintBox" style={{ borderColor: "#fecaca", color: "#991b1b", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      {diagnostic ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusPill tone={statusTone(summary.configuredStatus)}>configured: {summary.configuredStatus || "—"}</StatusPill>
            <StatusPill tone={statusTone(summary.effectiveStatus)}>effective: {summary.effectiveStatus || "—"}</StatusPill>
            {media.type ? <StatusPill tone={media.detected ? "good" : "warn"}>mídia: {media.type}</StatusPill> : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            <div className="templatesHintBox"><strong>Nome</strong><div>{summary.name || "—"}</div></div>
            <div className="templatesHintBox"><strong>Campaign</strong><div className="monoTag">{summary.campaignId || "—"}</div></div>
            <div className="templatesHintBox"><strong>AdSet</strong><div className="monoTag">{summary.adSetId || "—"}</div></div>
            <div className="templatesHintBox"><strong>UTM</strong><div>{summary.hasTrackableUtm ? "Rastreável" : "Ausente/incompleta"}</div></div>
          </div>

          {summary.finalUrl ? (
            <div className="templatesHintBox">
              <strong>URL final</strong>
              <div className="monoTag" style={{ marginTop: 6, whiteSpace: "normal", wordBreak: "break-all" }}>{summary.finalUrl}</div>
            </div>
          ) : null}

          {summary.previewShareableLink ? (
            <a className="templatesBtnOutline" href={summary.previewShareableLink} target="_blank" rel="noreferrer" style={{ textAlign: "center", textDecoration: "none" }}>
              Abrir preview Meta
            </a>
          ) : null}

          {alerts.length ? (
            <div style={{ display: "grid", gap: 6 }}>
              {alerts.map((alert, idx) => (
                <div key={idx} className="templatesHintBox" style={{ borderColor: "#fde68a", color: "#92400e" }}>
                  {alert.message} {alert.originalStatus ? `(${alert.originalStatus})` : ""}
                </div>
              ))}
            </div>
          ) : (
            <div className="templatesHintBox" style={{ borderColor: "#bbf7d0", color: "#166534" }}>
              Nenhum problema operacional óbvio detectado.
            </div>
          )}

          <AdvancedDisclosure summary="Abrir JSON técnico">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{safeJson(diagnostic)}</pre>
          </AdvancedDisclosure>
        </div>
      ) : null}
    </div>
  );
}
