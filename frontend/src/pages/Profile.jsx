import PageShell from "../components/PageShell.jsx";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAuthMe,
  listOperationalLanguages,
  toggleOperationalLanguage,
} from "../services/auth.js";
import {
  createMetaAccount,
  deleteMetaAccount,
  listMetaAccounts,
  setDefaultMetaAccount,
  updateMetaAccount,
  validateMetaAccount,
} from "../services/metaAccounts.js";
import { mergeLanguageCatalogWithActive } from "../utils/operationalLanguages.js";

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function displayUserName(user) {
  const raw = normalizeNonEmptyString(user?.name) || normalizeNonEmptyString(user?.username);
  if (!raw) return "";
  const withoutPrefix = raw.replace(/^@+/, "");
  return withoutPrefix ? withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1) : "";
}

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [operationalLanguages, setOperationalLanguages] = useState([]);
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
    countryHint: "BR",
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
        const languages = Array.isArray(res?.user?.operationalLanguages)
          ? res.user.operationalLanguages
          : mergeLanguageCatalogWithActive(res?.user?.operationalLanguageKeys || []);
        setOperationalLanguages(languages);
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
      countryHint: "BR",
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
      countryHint: String(acc?.countryHint ?? "BR"),
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
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao salvar conta Meta.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshOperationalLanguages() {
    const res = await listOperationalLanguages();
    setOperationalLanguages(Array.isArray(res?.operationalLanguages) ? res.operationalLanguages : []);
  }

  async function onAddAllAdditionalLanguages() {
    const inactiveAdditionalLanguages = operationalLanguages.filter((language) => !language.isCore && !language.active);
    if (saving || !inactiveAdditionalLanguages.length) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      let lastResponse = null;
      for (const language of inactiveAdditionalLanguages) {
        lastResponse = await toggleOperationalLanguage({ languageKey: language.key, active: true });
      }
      if (Array.isArray(lastResponse?.operationalLanguages)) {
        setOperationalLanguages(lastResponse.operationalLanguages);
      } else {
        await refreshOperationalLanguages();
      }
      setSuccess(`${inactiveAdditionalLanguages.length} idioma(s) adicional(is) ativado(s).`);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao adicionar idiomas.");
      await refreshOperationalLanguages();
    } finally {
      setSaving(false);
    }
  }

  const activeLanguages = operationalLanguages.filter((language) => language.active);
  const coreLanguages = operationalLanguages.filter((language) => language.isCore);
  const additionalLanguages = operationalLanguages.filter((language) => !language.isCore);
  const activeAdditionalLanguages = additionalLanguages.filter((language) => language.active);
  const inactiveAdditionalLanguages = additionalLanguages.filter((language) => !language.active);
  const allAdditionalLanguagesActive = additionalLanguages.length > 0 && inactiveAdditionalLanguages.length === 0;
  const availableMarketCount = activeLanguages.reduce((sum, language) => sum + (Array.isArray(language.marketCodes) ? language.marketCodes.length : 0), 0);
  const welcomeName = displayUserName(me);

  return (
    <PageShell title={welcomeName ? `Bem-vindo, ${welcomeName}` : "Bem-vindo"} subtitle="Gerencie seus idiomas e credenciais Meta" align="center" backFallbackTo="/">
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {loading ? (
          <section className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900 }}>Carregando...</div>
          </section>
        ) : (
          <>
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

            <section className="card" style={{ marginTop: 16, padding: 20 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Idiomas</div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div className="card" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontWeight: 500, fontSize: 12 }}>Idiomas ativos</div>
                  <div style={{ marginTop: 5, fontWeight: 950, fontSize: 22 }}>{activeLanguages.length}</div>
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontWeight: 500, fontSize: 12 }}>Idiomas extras</div>
                  <div style={{ marginTop: 5, fontWeight: 950, fontSize: 22 }}>{activeAdditionalLanguages.length}</div>
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div className="muted" style={{ fontWeight: 500, fontSize: 12 }}>Mercados disponíveis</div>
                  <div style={{ marginTop: 5, fontWeight: 950, fontSize: 22 }}>{availableMarketCount}</div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontWeight: 950, fontSize: 15 }}>Idiomas principais</div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                  {coreLanguages.map((language) => (
                    <div key={language.key} className="card" style={{ padding: 14, borderColor: "#bfdbfe", background: "#eff6ff" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                        <span style={{ fontSize: 20 }}>{language.icon || "🌎"}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 950, overflowWrap: "anywhere" }}>{language.label}</div>
                          <div className="muted" style={{ marginTop: 3, fontWeight: 400, fontSize: 12 }}>
                            {(language.marketCodes || []).length} mercado(s)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 950, fontSize: 15 }}>Idiomas adicionais</div>
                    <div className="muted" style={{ marginTop: 4, fontWeight: 400, fontSize: 12 }}>
                      Libera todos os idiomas adicionais disponíveis no catálogo operacional.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={allAdditionalLanguagesActive ? "pillPrimary" : "pillOutline"}
                    disabled={saving || !inactiveAdditionalLanguages.length}
                    onClick={onAddAllAdditionalLanguages}
                  >
                    {allAdditionalLanguagesActive ? "Todos os idiomas adicionados" : "Adicionar todos os idiomas"}
                  </button>
                </div>
                <div className="card" style={{ marginTop: 10, padding: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 950 }}>{activeAdditionalLanguages.length}/{additionalLanguages.length} adicionais ativos</div>
                    <div className="muted" style={{ marginTop: 4, fontWeight: 400, fontSize: 12 }}>
                      {inactiveAdditionalLanguages.length
                        ? `${inactiveAdditionalLanguages.length} idioma(s) adicional(is) ainda inativo(s).`
                        : "Todos os idiomas adicionais do catálogo estão ativos."}
                    </div>
                  </div>
                  <button type="button" className="pillOutline" disabled={saving} onClick={refreshOperationalLanguages}>
                    Atualizar resumo
                  </button>
                </div>
              </div>
            </section>

            <section className="card" style={{ marginTop: 16, padding: 20 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Contas Meta</div>
              <p style={{ marginTop: 6, marginBottom: 0, color: "#111827", fontWeight: 400 }}>
                Cadastre múltiplas contas para usar em templates e no fluxo de campanha. O token nunca é exibido completo.
              </p>

              <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div className="muted" style={{ fontWeight: 400 }}>
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
                            <div className="muted" style={{ marginTop: 6, fontWeight: 400 }}>
                              Ad Account:{" "}
                              <span className="monoTag">{acc.metaAdAccountId || "—"}</span> • Page:{" "}
                              <span className="monoTag">{acc.metaPageId || "—"}</span>
                            </div>
                            <div className="muted" style={{ marginTop: 6, fontWeight: 400, fontSize: 12 }}>
                              Token salvo: {acc?.metaAccessToken?.saved ? "Sim" : "Não"}
                              {acc?.metaAccessToken?.last4 ? ` (final: ...${acc.metaAccessToken.last4})` : ""}
                              {acc.businessLabel ? <> • {acc.businessLabel}</> : null}
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
                    <div className="muted" style={{ fontWeight: 400 }}>
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
                      <div style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>Nome interno</div>
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
                        <div style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>Meta Ad Account ID</div>
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
                        <div style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>Meta Page ID</div>
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
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>Meta Access Token</div>
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
                      <div style={{ color: "#111827", fontWeight: 400, fontSize: 12 }}>
                        Dica: depois de salvar, o token não é exibido (apenas o final). Não cole token em prints ou logs.
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>BM/Nicho/Operação (opcional)</div>
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

                    <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 850 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(metaAccountDraft.isDefault)}
                        onChange={(e) => setMetaAccountDraft((p) => ({ ...p, isDefault: e.target.checked }))}
                        disabled={saving}
                      />
                      Definir como padrão
                    </label>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" className="pillPrimary" disabled={saving} onClick={onSaveMetaAccount}>
                        {saving ? "Salvando..." : "Salvar conta Meta"}
                      </button>
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
