import PageShell from "../components/PageShell.jsx";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  addAllOperationalCountries,
  addOperationalCountry,
  getAuthMe,
  listOperationalCountries,
  logout,
  removeOperationalCountry,
  setOperationalCountryLanguage,
  saveMetaCredentials,
} from "../services/auth.js";
import { getCountries } from "../services/reference.js";

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
  const [countries, setCountries] = useState([]);
  const [operationalCountries, setOperationalCountries] = useState([]);
  const [countryToAdd, setCountryToAdd] = useState("BR");
  const [languageByCountry, setLanguageByCountry] = useState({});

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
        const list = Array.isArray(res?.user?.operationalCountries) ? res.user.operationalCountries : [];
        setOperationalCountries(list);
        setLanguageByCountry(
          Object.fromEntries(
            list
              .filter((i) => i?.countryCode)
              .map((i) => [i.countryCode, i.primaryLanguage ?? ""])
          )
        );
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

  useEffect(() => {
    let alive = true;
    getCountries()
      .then((res) => {
        if (!alive) return;
        setCountries(Array.isArray(res?.countries) ? res.countries : []);
      })
      .catch(() => {
        if (!alive) return;
        setCountries([]);
      });
    return () => {
      alive = false;
    };
  }, []);

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
      const list = Array.isArray(refreshed?.user?.operationalCountries) ? refreshed.user.operationalCountries : [];
      setOperationalCountries(list);
      setLanguageByCountry(
        Object.fromEntries(
          list
            .filter((i) => i?.countryCode)
            .map((i) => [i.countryCode, i.primaryLanguage ?? ""])
        )
      );
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

  async function refreshOperationalCountries() {
    const res = await listOperationalCountries({ limit: 500 });
    const list = Array.isArray(res?.operationalCountries) ? res.operationalCountries : [];
    setOperationalCountries(list);
    setLanguageByCountry(
      Object.fromEntries(
        list
          .filter((i) => i?.countryCode)
          .map((i) => [i.countryCode, i.primaryLanguage ?? ""])
      )
    );
  }

  async function onAddAllCountries() {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await addAllOperationalCountries();
      await refreshOperationalCountries();
      setSuccess(`Países adicionados ao perfil. (${res?.count ?? "—"})`);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao adicionar países.");
    } finally {
      setSaving(false);
    }
  }

  async function onAddOneCountry() {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await addOperationalCountry({ countryCode: countryToAdd });
      await refreshOperationalCountries();
      setSuccess("País adicionado.");
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao adicionar país.");
    } finally {
      setSaving(false);
    }
  }

  async function onRemoveCountry(code) {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await removeOperationalCountry({ countryCode: code });
      await refreshOperationalCountries();
      setSuccess("País removido.");
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao remover país.");
    } finally {
      setSaving(false);
    }
  }

  async function onSetLanguage(code, lang) {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await setOperationalCountryLanguage({ countryCode: code, primaryLanguage: lang || null });
      await refreshOperationalCountries();
      setSuccess("Idioma atualizado.");
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao atualizar idioma.");
    } finally {
      setSaving(false);
    }
  }

  const languageOptions = [
    { value: "", label: "—", disabled: false },
    { value: "pt", label: "Português", disabled: false },
    { value: "en", label: "Inglês", disabled: false },
    { value: "es", label: "Espanhol", disabled: false },
    { value: "fr", label: "Francês", disabled: false },
    { value: "de", label: "Alemão", disabled: false },
    { value: "it", label: "Italiano", disabled: false },
    { value: "ar", label: "Árabe", disabled: false },
  ];

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
                  <button type="button" className="pillOutline" onClick={() => navigate("/")}>
                    Voltar para Home
                  </button>
                  <button type="button" className="pillOutline" onClick={() => navigate("/campaign-flow")}>
                    Abrir fluxo de campanha
                  </button>
                  <button type="button" className="pillOutline" onClick={() => navigate("/roi-operacional")}>
                    Abrir /roi-operacional
                  </button>
                  <button type="button" className="pillOutline" onClick={() => navigate("/meta-test")}>
                    Abrir diagnóstico técnico
                  </button>
                  <button type="button" className="pillOutline" onClick={onLogout}>
                    Logout
                  </button>
                </div>
              </div>
            </section>

            <section className="card" style={{ marginTop: 16, padding: 20 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Países e idiomas da operação</div>
              <p style={{ marginTop: 6, marginBottom: 0, color: "#6b7280", fontWeight: 750 }}>
                O fluxo de campanha prioriza estes países como base para seleção em lote.
              </p>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" className="pillOutline" disabled={saving} onClick={onAddAllCountries}>
                  Criar todos os países possíveis
                </button>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    value={countryToAdd}
                    onChange={(e) => setCountryToAdd(e.target.value)}
                    disabled={saving}
                    style={{
                      height: 46,
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                      padding: "0 14px",
                      fontSize: 14,
                      fontWeight: 900,
                      background: "#ffffff",
                      minWidth: 220,
                    }}
                  >
                    {(countries || []).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="pillPrimary" disabled={saving} onClick={onAddOneCountry}>
                    Adicionar país
                  </button>
                </div>

                <div className="card" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 900 }}>Lista do usuário</div>
                  <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
                    {operationalCountries.length ? `${operationalCountries.length} país(es)` : "Nenhum país configurado"}
                  </div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {operationalCountries.length ? (
                      operationalCountries.map((item) => {
                        const code = item?.countryCode;
                        if (!code) return null;
                        return (
                          <div
                            key={code}
                            className="card"
                            style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}
                          >
                            <div style={{ fontWeight: 950 }}>{code}</div>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                              <select
                                value={languageByCountry[code] ?? ""}
                                disabled={saving}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setLanguageByCountry((p) => ({ ...p, [code]: next }));
                                  onSetLanguage(code, next);
                                }}
                                style={{
                                  height: 40,
                                  borderRadius: 12,
                                  border: "1px solid #e5e7eb",
                                  padding: "0 12px",
                                  fontSize: 13,
                                  fontWeight: 900,
                                  background: "#ffffff",
                                }}
                              >
                                {languageOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="pillOutline"
                                disabled={saving}
                                onClick={() => onRemoveCountry(code)}
                                title="Remover país"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="muted" style={{ fontWeight: 800 }}>
                        Dica: adicione pelo menos 1 país para operar lote com segurança.
                      </div>
                    )}
                  </div>
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
