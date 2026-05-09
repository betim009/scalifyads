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
  pushLog,
}) {
  return (
    <div id="meta-test-backend-status" className="card" style={{ padding: 18, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Status do backend (Meta)</div>
          <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
            Diagnóstico rápido de token/provider sem expor segredo.
          </div>
        </div>
        <button
          type="button"
          className="pillOutline"
          onClick={refreshBackendStatus}
          disabled={isCreatingAny || loading || backendStatusLoading}
        >
          {backendStatusLoading ? "Atualizando..." : "Atualizar status"}
        </button>
      </div>

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
          {backendStatusErrorDetails ? (
            <pre
              style={{
                marginTop: 12,
                background: "#0b1220",
                color: "#e5e7eb",
                padding: 12,
                borderRadius: 12,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
{safeJson(backendStatusErrorDetails)}
            </pre>
          ) : null}
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
        <div className="muted" style={{ fontWeight: 800 }}>
          {backendStatus?.hasAccessToken ? "Recomendado antes de criar REAL." : "Adicione token no backend para habilitar REAL."}
        </div>
      </div>

      {validateError ? (
        <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ fontWeight: 900 }}>Erro (validate)</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{validateError}</div>
          {validateErrorDetails ? (
            <pre
              style={{
                marginTop: 12,
                background: "#0b1220",
                color: "#e5e7eb",
                padding: 12,
                borderRadius: 12,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
{safeJson(validateErrorDetails)}
            </pre>
          ) : null}
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
    </div>
  );
}

