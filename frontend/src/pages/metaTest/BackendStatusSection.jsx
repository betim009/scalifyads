import CollapsibleCard from "./CollapsibleCard.jsx";
import JsonAccordion from "./JsonAccordion.jsx";
import { useState } from "react";

export default function BackendStatusSection({
  refreshBackendStatus,
  isCreatingAny,
  loading,
  backendStatusLoading,
  backendStatusError,
  backendStatusErrorDetails,
  setBackendStatusError,
  setBackendStatusErrorDetails,
  safeJson,
  backendStatus,
  validateLoading,
  setValidateLoading,
  validateError,
  setValidateError,
  validateErrorDetails,
  setValidateErrorDetails,
  validateMe,
  setValidateMe,
  validateMetaToken,
  diagnosticsLoading,
  setDiagnosticsLoading,
  diagnosticsError,
  setDiagnosticsError,
  diagnosticsErrorDetails,
  setDiagnosticsErrorDetails,
  diagnosticsMe,
  setDiagnosticsMe,
  getMetaDiagnostics,
  pushLog,
}) {
  const [copyStatus, setCopyStatus] = useState("");

  return (
    <CollapsibleCard
      id="meta-test-backend-status"
      title="Status do backend (Meta)"
      description="Diagnóstico rápido de token/provider sem expor segredo."
      defaultOpen={false}
      headerRight={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="pillOutline"
            onClick={async () => {
              setCopyStatus("");
              const text = safeJson(backendStatus ?? null);
              try {
                await navigator.clipboard.writeText(text);
                setCopyStatus("Status copiado.");
              } catch {
                setCopyStatus("Falha ao copiar.");
              } finally {
                window.setTimeout(() => setCopyStatus(""), 3500);
              }
            }}
            disabled={!backendStatus || backendStatusLoading}
          >
            Copiar JSON
          </button>
          <button
            type="button"
            className="pillOutline"
            onClick={refreshBackendStatus}
            disabled={isCreatingAny || loading || backendStatusLoading}
          >
            {backendStatusLoading ? "Atualizando..." : "Atualizar status"}
          </button>
        </div>
      }
    >

      {copyStatus ? (
        <div className="muted" style={{ marginTop: 12, fontWeight: 900 }}>
          {copyStatus}
        </div>
      ) : null}

      {backendStatus?.hasAccessToken && !backendStatus?.hasPageId ? (
        <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fed7aa", color: "#9a3412" }}>
          <div style={{ fontWeight: 900 }}>Atenção: `META_PAGE_ID` ausente</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800, color: "#9a3412" }}>
            Publish de Creative REAL exige `pageId`. Você pode preencher no UI (Etapa 3 → “Listar Pages (Graph)” → “Usar pageId”)
            ou configurar no backend via env.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="pillOutline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText("META_PAGE_ID=\nMETA_INSTAGRAM_ACTOR_ID=\n");
                  setCopyStatus("Snippet (.env) copiado.");
                } catch {
                  setCopyStatus("Falha ao copiar snippet.");
                } finally {
                  window.setTimeout(() => setCopyStatus(""), 3500);
                }
              }}
            >
              Copiar snippet (.env)
            </button>
          </div>
        </div>
      ) : null}

      {backendStatusError ? (
        <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Erro</div>
            <button
              type="button"
              className="pillOutline"
              onClick={() => {
                setBackendStatusError("");
                setBackendStatusErrorDetails(null);
              }}
              style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
            >
              Fechar
            </button>
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{backendStatusError}</div>
          <JsonAccordion title="Detalhes (backend status)" value={backendStatusErrorDetails} safeJson={safeJson} />
        </div>
      ) : null}

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div className="card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            DB habilitado
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {backendStatusLoading ? "LOADING" : backendStatus?.dbEnabled ? "SIM" : "NÃO"}
          </div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Sem DB, `/meta-test` não consegue persistir drafts/assets.
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            Provider
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {backendStatusLoading ? "LOADING" : (backendStatus?.provider ?? "—")}
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            Graph version
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {backendStatusLoading ? "LOADING" : (backendStatus?.graphVersion ?? "—")}
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            Token no backend
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {backendStatusLoading
              ? "LOADING"
              : backendStatus?.hasAccessToken
              ? "SIM (REAL disponível)"
              : "NÃO (somente STUB)"}
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            `META_PAGE_ID` (env)
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {backendStatusLoading ? "LOADING" : backendStatus?.hasPageId ? "SIM" : "NÃO"}
          </div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Requerido para publish de Creative REAL (se não for enviado no UI).
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            `META_INSTAGRAM_ACTOR_ID` (env)
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {backendStatusLoading ? "LOADING" : backendStatus?.hasInstagramActorId ? "SIM" : "NÃO"}
          </div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Opcional (pode ser enviado no UI).
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className="pillOutline"
          disabled={validateLoading || isCreatingAny || !backendStatus?.hasAccessToken}
          onClick={async () => {
            setValidateLoading(true);
            setValidateError("");
            setValidateErrorDetails(null);
            setValidateMe(null);
            try {
              const res = await validateMetaToken();
              setValidateMe(res.me ?? null);
              pushLog({ action: "meta.validate", ok: true, details: { me: res?.me ?? null } });
            } catch (err) {
              setValidateMe(null);
              setValidateError(err?.message ? String(err.message) : "Falha ao validar token.");
              const details = err?.body?.error?.details ?? err?.body ?? null;
              setValidateErrorDetails(details);
              pushLog({
                action: "meta.validate",
                ok: false,
                error: err?.message ? String(err.message) : "error",
                details,
              });
            } finally {
              setValidateLoading(false);
            }
          }}
        >
          {validateLoading ? "Validando..." : "Validar token (Graph /me)"}
        </button>
        <button
          type="button"
          className="pillOutline"
          disabled={diagnosticsLoading || isCreatingAny || !backendStatus?.hasAccessToken}
          onClick={async () => {
            setDiagnosticsLoading(true);
            setDiagnosticsError("");
            setDiagnosticsErrorDetails(null);
            setDiagnosticsMe(null);
            try {
              const res = await getMetaDiagnostics();
              setDiagnosticsMe(res.me ?? null);
              pushLog({ action: "meta.diagnostics", ok: true, details: { me: res?.me ?? null } });
            } catch (err) {
              setDiagnosticsMe(null);
              setDiagnosticsError(err?.message ? String(err.message) : "Falha ao consultar diagnostics.");
              const details = err?.body?.error?.details ?? err?.body ?? null;
              setDiagnosticsErrorDetails(details);
              pushLog({
                action: "meta.diagnostics",
                ok: false,
                error: err?.message ? String(err.message) : "error",
                details,
              });
            } finally {
              setDiagnosticsLoading(false);
            }
          }}
        >
          {diagnosticsLoading ? "Consultando..." : "Diagnostics (permissões)"}
        </button>
        <div className="muted" style={{ fontWeight: 800 }}>
          {backendStatus?.hasAccessToken ? "Recomendado antes de criar REAL." : "Adicione token no backend para habilitar REAL."}
        </div>
      </div>

      {validateError ? (
        <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Erro (validate)</div>
            <button
              type="button"
              className="pillOutline"
              onClick={() => {
                setValidateError("");
                setValidateErrorDetails(null);
              }}
              style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
            >
              Fechar
            </button>
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{validateError}</div>
          <JsonAccordion title="Detalhes (validate)" value={validateErrorDetails} safeJson={safeJson} />
        </div>
      ) : null}

      {validateMe ? (
        <div className="card" style={{ padding: 14, marginTop: 12 }}>
          <div className="muted" style={{ fontWeight: 900 }}>
            Token OK
          </div>
          <div style={{ marginTop: 6, fontWeight: 900 }}>
            {validateMe?.name ? `${validateMe.name} (${validateMe.id})` : validateMe?.id ?? "—"}
          </div>
        </div>
      ) : null}

      {diagnosticsError ? (
        <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Erro (diagnostics)</div>
            <button
              type="button"
              className="pillOutline"
              onClick={() => {
                setDiagnosticsError("");
                setDiagnosticsErrorDetails(null);
              }}
              style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
            >
              Fechar
            </button>
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{diagnosticsError}</div>
          <JsonAccordion title="Detalhes (diagnostics)" value={diagnosticsErrorDetails} safeJson={safeJson} />
        </div>
      ) : null}

      <JsonAccordion title="Diagnostics (token)" value={diagnosticsMe} safeJson={safeJson} />
    </CollapsibleCard>
  );
}
