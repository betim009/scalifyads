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
} from "../services/auth.js";
import { getCountries } from "../services/reference.js";
import {
  createMetaAccount,
  deleteMetaAccount,
  listMetaAccounts,
  setDefaultMetaAccount,
  updateMetaAccount,
  validateMetaAccount,
} from "../services/metaAccounts.js";

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
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [metaAccountsLoading, setMetaAccountsLoading] = useState(false);
  const [metaAccountEditingId, setMetaAccountEditingId] = useState(null);
  const [metaAccountDraft, setMetaAccountDraft] = useState({
    name: "",
    metaAdAccountId: "",
    metaPageId: "",
    metaAccessToken: "",
    metaInstagramActorId: "",
    businessLabel: "",
    countryHint: "",
    notes: "",
    isDefault: false,
    isActive: true,
  });

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

  async function refreshMetaAccounts() {
    setMetaAccountsLoading(true);
    try {
      const res = await listMetaAccounts();
      setMetaAccounts(Array.isArray(res?.metaAccounts) ? res.metaAccounts : []);
    } catch {
      setMetaAccounts([]);
    } finally {
      setMetaAccountsLoading(false);
    }
  }

  useEffect(() => {
    refreshMetaAccounts();
  }, []);

  function startNewMetaAccount() {
    setMetaAccountEditingId(null);
    setMetaAccountDraft({
      name: "",
      metaAdAccountId: "",
      metaPageId: "",
      metaAccessToken: "",
      metaInstagramActorId: "",
      businessLabel: "",
      countryHint: "",
      notes: "",
      isDefault: false,
      isActive: true,
    });
  }

  function startEditMetaAccount(acc) {
    setMetaAccountEditingId(acc?.id ? String(acc.id) : null);
    setMetaAccountDraft({
      name: String(acc?.name ?? ""),
      metaAdAccountId: String(acc?.metaAdAccountId ?? ""),
      metaPageId: String(acc?.metaPageId ?? ""),
      metaAccessToken: "",
      metaInstagramActorId: String(acc?.metaInstagramActorId ?? ""),
      businessLabel: String(acc?.businessLabel ?? ""),
      countryHint: String(acc?.countryHint ?? ""),
      notes: String(acc?.notes ?? ""),
      isDefault: Boolean(acc?.isDefault),
      isActive: acc?.isActive === false ? false : true,
    });
  }

  async function onSaveMetaAccount() {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: normalizeNonEmptyString(metaAccountDraft.name) || null,
        metaAdAccountId: normalizeNonEmptyString(metaAccountDraft.metaAdAccountId) || null,
        metaPageId: normalizeNonEmptyString(metaAccountDraft.metaPageId) || null,
        metaAccessToken:
          metaAccountDraft.metaAccessToken === ""
            ? undefined
            : normalizeNonEmptyString(metaAccountDraft.metaAccessToken) || null,
        metaInstagramActorId: normalizeNonEmptyString(metaAccountDraft.metaInstagramActorId) || null,
        businessLabel: normalizeNonEmptyString(metaAccountDraft.businessLabel) || null,
        countryHint: normalizeNonEmptyString(metaAccountDraft.countryHint) || null,
        notes: normalizeNonEmptyString(metaAccountDraft.notes) || null,
        isDefault: Boolean(metaAccountDraft.isDefault),
        isActive: metaAccountDraft.isActive !== false,
      };
      if (!payload.name) {
        setError("Informe um nome interno para a conta.");
        return;
      }

      if (metaAccountEditingId) {
        await updateMetaAccount(metaAccountEditingId, payload);
        setSuccess("Conta Meta atualizada.");
      } else {
        await createMetaAccount(payload);
        setSuccess("Conta Meta criada.");
      }
      setMetaAccountDraft((p) => ({ ...p, metaAccessToken: "" }));
      await refreshMetaAccounts();
      const refreshed = await getAuthMe();
      setMe(refreshed.user ?? null);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao salvar conta Meta.");
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
              <div style={{ fontWeight: 950, fontSize: 18 }}>Contas Meta</div>
              <p style={{ marginTop: 6, marginBottom: 0, color: "#6b7280", fontWeight: 750 }}>
                Cadastre múltiplas contas para usar em templates e no fluxo de campanha. O token nunca é exibido completo.
              </p>

              <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div className="muted" style={{ fontWeight: 800 }}>
                    {metaAccountsLoading ? "Carregando contas…" : `${metaAccounts.length} conta(s) cadastrada(s)`}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="button" className="pillOutline" disabled={saving} onClick={refreshMetaAccounts}>
                      Atualizar
                    </button>
                    <button type="button" className="pillPrimary" disabled={saving} onClick={startNewMetaAccount}>
                      Nova conta
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {metaAccounts.length ? (
                    metaAccounts.map((acc) => (
                      <div key={acc.id} className="card" style={{ padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 950, fontSize: 16 }}>
                              {acc.name}{" "}
                              {acc.isDefault ? (
                                <span className="pillOutline" style={{ marginLeft: 10, background: "#dcfce7", borderColor: "#bbf7d0" }}>
                                  Padrão
                                </span>
                              ) : null}
                              {!acc.isActive ? (
                                <span className="pillOutline" style={{ marginLeft: 10, background: "#f3f4f6" }}>
                                  Inativa
                                </span>
                              ) : null}
                            </div>
                            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
                              Ad Account: <b>{acc.metaAdAccountId || "—"}</b> • Page: <b>{acc.metaPageId || "—"}</b>
                              {acc.metaInstagramActorId ? <> • IG Actor: <b>{acc.metaInstagramActorId}</b></> : null}
                            </div>
                            <div className="muted" style={{ marginTop: 6, fontWeight: 800, fontSize: 12 }}>
                              Token salvo: {acc?.metaAccessToken?.saved ? "Sim" : "Não"}
                              {acc?.metaAccessToken?.last4 ? ` (final: ...${acc.metaAccessToken.last4})` : ""}
                              {acc.businessLabel ? <> • {acc.businessLabel}</> : null}
                              {acc.countryHint ? <> • País: {acc.countryHint}</> : null}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button type="button" className="pillOutline" disabled={saving} onClick={() => startEditMetaAccount(acc)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="pillOutline"
                              disabled={saving || acc.isDefault}
                              onClick={async () => {
                                setSaving(true);
                                setError("");
                                setSuccess("");
                                try {
                                  await setDefaultMetaAccount(acc.id);
                                  setSuccess("Conta padrão atualizada.");
                                  await refreshMetaAccounts();
                                  const refreshed = await getAuthMe();
                                  setMe(refreshed.user ?? null);
                                } catch (err) {
                                  setError(err?.message ? String(err.message) : "Falha ao definir como padrão.");
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              Definir como padrão
                            </button>
                            <button
                              type="button"
                              className="pillOutline"
                              disabled={saving || !acc.isActive}
                              onClick={async () => {
                                setSaving(true);
                                setError("");
                                setSuccess("");
                                try {
                                  const res = await validateMetaAccount(acc.id);
                                  const metaId = res?.me?.id ? ` (Meta user: ${res.me.id})` : "";
                                  setSuccess(`Conta validada com sucesso.${metaId}`);
                                } catch (err) {
                                  setError(err?.message ? String(err.message) : "Falha ao validar conta.");
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              Validar conta
                            </button>
                            <button
                              type="button"
                              className="pillOutline"
                              disabled={saving || !acc.isActive}
                              onClick={async () => {
                                const ok = window.confirm("Desativar esta conta Meta? (Pode reativar editando depois)");
                                if (!ok) return;
                                setSaving(true);
                                setError("");
                                setSuccess("");
                                try {
                                  await deleteMetaAccount(acc.id);
                                  setSuccess("Conta Meta desativada.");
                                  await refreshMetaAccounts();
                                } catch (err) {
                                  setError(err?.message ? String(err.message) : "Falha ao desativar conta.");
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              Desativar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="muted" style={{ fontWeight: 800 }}>
                      Nenhuma conta cadastrada. Crie uma conta para operar em REAL.
                    </div>
                  )}
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950 }}>
                      {metaAccountEditingId ? "Editar conta Meta" : "Nova conta Meta"}
                    </div>
                    {metaAccountEditingId ? (
                      <button type="button" className="pillOutline" disabled={saving} onClick={startNewMetaAccount}>
                        Cancelar edição
                      </button>
                    ) : null}
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Nome interno</div>
                      <input
                        value={metaAccountDraft.name}
                        onChange={(e) => setMetaAccountDraft((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Ex: Conta principal / AH Jobs USA / BM Cursos Alemanha"
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

                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Meta Ad Account ID</div>
                        <input
                          value={metaAccountDraft.metaAdAccountId}
                          onChange={(e) => setMetaAccountDraft((p) => ({ ...p, metaAdAccountId: e.target.value }))}
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
                          value={metaAccountDraft.metaPageId}
                          onChange={(e) => setMetaAccountDraft((p) => ({ ...p, metaPageId: e.target.value }))}
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
                        <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Instagram Actor ID (opcional)</div>
                        <input
                          value={metaAccountDraft.metaInstagramActorId}
                          onChange={(e) => setMetaAccountDraft((p) => ({ ...p, metaInstagramActorId: e.target.value }))}
                          placeholder="1784..."
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
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Meta Access Token</div>
                      <input
                        type="password"
                        value={metaAccountDraft.metaAccessToken}
                        onChange={(e) => setMetaAccountDraft((p) => ({ ...p, metaAccessToken: e.target.value }))}
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
                        Dica: depois de salvar, o token não é exibido (apenas o final). Não cole token em prints ou logs.
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>BM/Nicho/Operação (opcional)</div>
                        <input
                          value={metaAccountDraft.businessLabel}
                          onChange={(e) => setMetaAccountDraft((p) => ({ ...p, businessLabel: e.target.value }))}
                          placeholder="Ex: BM Cursos / Jobs / Receitas"
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
                        <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>País principal (opcional)</div>
                        <input
                          value={metaAccountDraft.countryHint}
                          onChange={(e) => setMetaAccountDraft((p) => ({ ...p, countryHint: e.target.value }))}
                          placeholder="Ex: BR"
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
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Observações (opcional)</div>
                      <textarea
                        value={metaAccountDraft.notes}
                        onChange={(e) => setMetaAccountDraft((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Notas internas da operação…"
                        disabled={saving}
                        rows={3}
                        style={{
                          borderRadius: 14,
                          border: "1px solid #e5e7eb",
                          padding: "12px 16px",
                          fontSize: 14,
                          fontWeight: 650,
                          resize: "vertical",
                        }}
                      />
                    </div>

                    <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 850 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(metaAccountDraft.isDefault)}
                        onChange={(e) => setMetaAccountDraft((p) => ({ ...p, isDefault: e.target.checked }))}
                        disabled={saving}
                      />
                      Definir como padrão
                    </label>

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
                      <button type="button" className="pillPrimary" disabled={saving} onClick={onSaveMetaAccount}>
                        {saving ? "Salvando..." : "Salvar conta Meta"}
                      </button>
                      <Link to="/login" style={{ fontWeight: 800, alignSelf: "center" }}>
                        Voltar ao login
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
