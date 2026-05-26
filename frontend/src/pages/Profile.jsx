import PageShell from "../components/PageShell.jsx";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthMe, logout, saveMetaCredentials } from "../services/auth.js";

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [metaPageId, setMetaPageId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getAuthMe()
      .then((res) => {
        if (!alive) return;
        if (!res?.authenticated) {
          navigate("/login?next=%2Fprofile", { replace: true });
          return;
        }
        setMe(res.user ?? null);
        setMetaAdAccountId(res?.user?.metaAdAccountId ?? "");
        setMetaPageId(res?.user?.metaPageId ?? "");
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message ? String(err.message) : "Falha ao carregar perfil.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [navigate]);

  async function onSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await saveMetaCredentials({
        metaAdAccountId: normalizeNonEmptyString(metaAdAccountId) || null,
        metaPageId: normalizeNonEmptyString(metaPageId) || null,
        metaAccessToken: normalizeNonEmptyString(metaAccessToken) || null,
      });
      setMetaAccessToken("");
      setSuccess("Credenciais salvas (token não é exibido).");
      const refreshed = await getAuthMe();
      setMe(refreshed.user ?? null);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao salvar credenciais.");
    } finally {
      setSaving(false);
    }
  }

  async function onLogout() {
    setError("");
    setSuccess("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao sair.");
    }
  }

  return (
    <PageShell title="Perfil" subtitle="Configuração interna + credenciais Meta por usuário" align="center" backFallbackTo="/">
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {loading ? (
          <section className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900 }}>Carregando...</div>
          </section>
        ) : (
          <>
            <section className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 18 }}>Usuário</div>
                  <div style={{ marginTop: 6, fontWeight: 800, color: "#374151" }}>
                    {me?.username ? `@${me.username}` : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="button" className="pillOutline" onClick={() => navigate("/campaign-flow")}>
                    Abrir /campaign-flow
                  </button>
                  <button type="button" className="pillOutline" onClick={() => navigate("/meta-test")}>
                    Abrir /meta-test
                  </button>
                  <button type="button" className="pillOutline" onClick={onLogout}>
                    Logout
                  </button>
                </div>
              </div>
            </section>

            <section className="card" style={{ marginTop: 16, padding: 20 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Credenciais Meta</div>
              <p style={{ marginTop: 6, marginBottom: 0, color: "#6b7280", fontWeight: 750 }}>
                O token nunca é exibido completo e nunca deve ir para logs/frontend.
              </p>

              <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Meta Ad Account ID</div>
                  <input
                    value={metaAdAccountId}
                    onChange={(e) => setMetaAdAccountId(e.target.value)}
                    placeholder="act_..."
                    disabled={saving}
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                      padding: "0 16px",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Meta Page ID</div>
                  <input
                    value={metaPageId}
                    onChange={(e) => setMetaPageId(e.target.value)}
                    placeholder="123456789012345"
                    disabled={saving}
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                      padding: "0 16px",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Meta Access Token</div>
                  <input
                    type="password"
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                    placeholder="colar aqui (não será exibido depois)"
                    disabled={saving}
                    style={{
                      height: 48,
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                      padding: "0 16px",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  />
                  <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12 }}>
                    Token salvo: {me?.metaAccessToken?.saved ? "Sim" : "Não"}
                    {me?.metaAccessToken?.last4 ? ` (final: ...${me.metaAccessToken.last4})` : ""}
                  </div>
                </div>

                {error ? (
                  <div className="card" style={{ padding: 12, borderColor: "#fecaca", color: "#991b1b" }}>
                    <div style={{ fontWeight: 900 }}>{error}</div>
                  </div>
                ) : null}
                {success ? (
                  <div className="card" style={{ padding: 12, borderColor: "#bbf7d0", color: "#166534" }}>
                    <div style={{ fontWeight: 900 }}>{success}</div>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" className="pillPrimary" disabled={saving} onClick={onSave}>
                    {saving ? "Salvando..." : "Salvar credenciais"}
                  </button>
                  <Link to="/login" style={{ fontWeight: 800, alignSelf: "center" }}>
                    Voltar ao login
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}

