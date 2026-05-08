import PageShell from "../components/PageShell.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useEffect, useMemo, useState } from "react";
import { getCountries } from "../services/reference.js";
import {
  createMetaCampaignSimple,
  getMetaCampaign,
  getMetaStatus,
  listMetaAdAccountCampaigns,
  validateMetaToken,
} from "../services/meta.js";
import { countryCodeToFlag } from "../services/fallbacks.js";

const OBJECTIVE_OPTIONS = [
  { value: "OUTCOME_TRAFFIC", label: "OUTCOME_TRAFFIC" },
  { value: "OUTCOME_LEADS", label: "OUTCOME_LEADS" },
  { value: "OUTCOME_SALES", label: "OUTCOME_SALES" },
];

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed : "";
}

function normalizeMetaAdAccountId(value) {
  const raw = normalizeNonEmptyString(value);
  if (!raw) return "";
  const stripped = raw.replace(/^act_/, "");
  if (!/^\d+$/.test(stripped)) return "";
  return `act_${stripped}`;
}

function isRealMetaId(metaId) {
  const id = normalizeNonEmptyString(metaId);
  return Boolean(id) && !id.startsWith("stub-");
}

export default function MetaPausedTest() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [countries, setCountries] = useState([]);
  const [countriesSource, setCountriesSource] = useState("api");

  const [mode, setMode] = useState("REAL");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const [created, setCreated] = useState(null);
  const [createdLoading, setCreatedLoading] = useState(false);

  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [metaCampaigns, setMetaCampaigns] = useState([]);

  const [backendStatus, setBackendStatus] = useState(null);
  const [backendStatusError, setBackendStatusError] = useState("");
  const [validateLoading, setValidateLoading] = useState(false);
  const [validateError, setValidateError] = useState("");
  const [validateMe, setValidateMe] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await getCountries();
      const list = res.countries ?? [];
      setCountries(list);
      setCountriesSource(res.source ?? "api");
      setCountryCode((prev) => (normalizeNonEmptyString(prev) ? prev : (list[0]?.code ?? "")));
    } catch (err) {
      setCountries([]);
      setCountriesSource("fallback");
      setError(err?.message ? String(err.message) : "Falha ao carregar países.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshBackendStatus() {
    setBackendStatusError("");
    try {
      const res = await getMetaStatus();
      setBackendStatus(res);
    } catch (err) {
      setBackendStatus(null);
      setBackendStatusError(err?.message ? String(err.message) : "Falha ao consultar /api/meta/status.");
    }
  }

  useEffect(() => {
    refresh();
    refreshBackendStatus();
  }, []);

  const countryOptions = useMemo(() => countries ?? [], [countries]);
  const selectedCountry = useMemo(
    () => countryOptions.find((c) => c.code === countryCode) ?? null,
    [countryOptions, countryCode],
  );

  const canCreate =
    !loading &&
    !busy &&
    normalizeNonEmptyString(name) !== "" &&
    normalizeNonEmptyString(objective) !== "" &&
    normalizeNonEmptyString(normalizeMetaAdAccountId(metaAdAccountId)) !== "" &&
    normalizeNonEmptyString(countryCode) !== "";

  const adAccountNormalized = useMemo(() => normalizeMetaAdAccountId(metaAdAccountId), [metaAdAccountId]);

  return (
    <PageShell
      title="Meta (lab): Campaign → AdSet → Ad"
      subtitle="Fluxo progressivo operacional — criação REAL sempre PAUSED"
      backFallbackTo="/configuracoes"
    >
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 900 }}>Regras (segurança)</div>
        <ul className="muted" style={{ marginTop: 10, fontWeight: 800, lineHeight: 1.55 }}>
          <li>Esta página NÃO envia token para o frontend.</li>
          <li>O backend deve ter token via `META_ACCESS_TOKEN` ou `POST /api/meta/tokens`.</li>
          <li>Toda criação REAL deve nascer como `PAUSED` (forçado no backend).</li>
        </ul>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 900 }}>Modos operacionais</div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          <div>
            <b>REAL</b>: backend chama Meta Graph/Marketing API (token válido) e persiste IDs reais.
          </div>
          <div style={{ marginTop: 6 }}>
            <b>STUB</b>: não chama Meta; cria IDs `stub-*` para testar fluxo/persistência.
          </div>
          <div style={{ marginTop: 6 }}>
            <b>FALLBACK</b>: UI usa dados locais quando API/DB não estiverem disponíveis (sempre sinalizado).
          </div>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: 18, marginTop: 16, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ fontWeight: 900 }}>Erro</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{error}</div>
        </div>
      ) : null}

      {success ? (
        <div className="card" style={{ padding: 18, marginTop: 16, borderColor: "#bbf7d0", color: "#14532d" }}>
          <div style={{ fontWeight: 900 }}>Sucesso</div>
          <div style={{ marginTop: 6, fontWeight: 800 }}>{success}</div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
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
            disabled={busy || loading}
          >
            Atualizar status
          </button>
        </div>

        {backendStatusError ? (
          <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
            <div style={{ fontWeight: 900 }}>Erro</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{backendStatusError}</div>
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Provider
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>{backendStatus?.provider ?? "—"}</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Graph version
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>{backendStatus?.graphVersion ?? "—"}</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="muted" style={{ fontWeight: 900 }}>
              Token no backend
            </div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              {backendStatus?.hasAccessToken ? "SIM (REAL disponível)" : "NÃO (somente STUB)"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="pillOutline"
            disabled={validateLoading || busy || !backendStatus?.hasAccessToken}
            onClick={async () => {
              setValidateLoading(true);
              setValidateError("");
              try {
                const res = await validateMetaToken();
                setValidateMe(res.me ?? null);
              } catch (err) {
                setValidateMe(null);
                setValidateError(err?.message ? String(err.message) : "Falha ao validar token.");
              } finally {
                setValidateLoading(false);
              }
            }}
          >
            {validateLoading ? "Validando..." : "Validar token (Graph /me)"}
          </button>
          <div className="muted" style={{ fontWeight: 800 }}>
            {backendStatus?.hasAccessToken
              ? "Recomendado antes de criar REAL."
              : "Adicione token no backend para habilitar REAL."}
          </div>
        </div>

        {validateError ? (
          <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
            <div style={{ fontWeight: 900 }}>Erro (validate)</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{validateError}</div>
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

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Etapa 1 — Campaign (mínimo)</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              Nome + Objective + Ad Account + País.
            </div>
          </div>
          <button type="button" className="pillOutline" onClick={refresh} disabled={loading || busy}>
            Atualizar
          </button>
        </div>

        <div className="muted" style={{ marginTop: 10, fontWeight: 800 }}>
          Fonte países:{" "}
          <span style={{ fontWeight: 900 }}>{countriesSource === "fallback" ? "FALLBACK" : "API"}</span>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Nome
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lançamento Produto X"
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 700,
                outline: "none",
                background: "#ffffff",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Meta Ad Account ID (formato `act_...`)
            </span>
            <input
              value={metaAdAccountId}
              onChange={(e) => setMetaAdAccountId(e.target.value)}
              placeholder="act_259174718403969"
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 700,
                outline: "none",
                background: "#ffffff",
              }}
            />
            {normalizeNonEmptyString(metaAdAccountId) && !adAccountNormalized ? (
              <span className="muted" style={{ fontWeight: 800, color: "#991b1b" }}>
                Formato inválido. Use `act_` + dígitos (ex: `act_123...`).
              </span>
            ) : null}
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              País
            </span>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 800,
                outline: "none",
                background: "#ffffff",
              }}
            >
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
              {!countryOptions.length ? <option value="">(sem países)</option> : null}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Objective
            </span>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 800,
                outline: "none",
                background: "#ffffff",
              }}
            >
              {OBJECTIVE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Modo
            </span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 900,
                outline: "none",
                background: "#ffffff",
              }}
            >
              <option value="REAL">REAL</option>
              <option value="STUB">STUB</option>
            </select>
          </label>

          <button
            type="button"
            className="pillOutline"
            disabled={!canCreate}
            onClick={async () => {
              setBusy(true);
              setCreatedLoading(true);
              setError("");
              setSuccess("");
              setCreated(null);
              try {
                const res = await createMetaCampaignSimple({
                  name: name.trim(),
                  objective,
                  metaAdAccountId: adAccountNormalized,
                  countryCode,
                  mode,
                });
                setCreated(res);
                setSuccess(`Campaign criada (${res.mode || mode}) — status obrigatório: PAUSED.`);
                await refreshBackendStatus();
              } catch (err) {
                setError(err?.message ? String(err.message) : "Falha ao criar Campaign.");
              } finally {
                setCreatedLoading(false);
                setBusy(false);
              }
            }}
          >
            {busy ? "Criando..." : `Criar Campaign ${mode} (PAUSED)`}
          </button>

          <button
            type="button"
            className="pillOutline"
            disabled={normalizeNonEmptyString(metaAdAccountId) === "" || metaLoading}
            onClick={async () => {
              setMetaLoading(true);
              setMetaError("");
              try {
                const res = await listMetaAdAccountCampaigns({
                  metaAdAccountId: adAccountNormalized || metaAdAccountId.trim(),
                  limit: 100,
                  pausedOnly: true,
                });
                setMetaCampaigns(res.metaCampaigns ?? []);
              } catch (err) {
                setMetaError(err?.message ? String(err.message) : "Falha ao listar campanhas na Meta (PAUSED).");
                setMetaCampaigns([]);
              } finally {
                setMetaLoading(false);
              }
            }}
          >
            {metaLoading ? "Listando..." : "Listar PAUSED na Meta"}
          </button>
        </div>

        {metaError ? (
          <div className="card" style={{ padding: 14, marginTop: 12, borderColor: "#fecaca", color: "#991b1b" }}>
            <div style={{ fontWeight: 900 }}>Erro (Meta)</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{metaError}</div>
          </div>
        ) : null}
      </div>

      {created?.metaCampaign ? (
        <div className="card" style={{ padding: 18, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Resultado</div>
            <div className="muted" style={{ fontWeight: 900 }}>
              Modo: <span style={{ fontWeight: 900 }}>{created.mode || "—"}</span>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                Meta Campaign ID
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{created.metaCampaign.id || "—"}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                País
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>
                {selectedCountry ? `${countryCodeToFlag(selectedCountry.code)} ${selectedCountry.code}` : countryCode}
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                Status
              </div>
              <div style={{ marginTop: 8 }}>
                <StatusBadge>{created.metaCampaign.status || "—"}</StatusBadge>
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontWeight: 900 }}>
                Effective Status
              </div>
              <div style={{ marginTop: 8 }}>
                <StatusBadge>{created.metaCampaign.effective_status || "—"}</StatusBadge>
              </div>
            </div>
          </div>

          <div className="muted" style={{ marginTop: 12, fontWeight: 800 }}>
            Persistência local:
            <div style={{ marginTop: 6 }}>
              `generated_campaigns.id`: <b>{created.generatedCampaign?.id || "—"}</b>
            </div>
            <div style={{ marginTop: 6 }}>
              `generated_campaigns.meta_campaign_id`:{" "}
              <b>{created.generatedCampaign?.meta_campaign_id || "—"}</b>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="pillOutline"
              disabled={
                createdLoading ||
                busy ||
                !backendStatus?.hasAccessToken ||
                !isRealMetaId(created.metaCampaign?.id)
              }
              onClick={async () => {
                setCreatedLoading(true);
                setError("");
                try {
                  const res = await getMetaCampaign(created.metaCampaign.id);
                  setCreated((prev) => ({
                    ...(prev ?? {}),
                    metaCampaign: res.metaCampaign ?? prev?.metaCampaign ?? null,
                  }));
                  setSuccess("Status atualizado via Graph.");
                } catch (err) {
                  setError(err?.message ? String(err.message) : "Falha ao consultar Campaign no Graph.");
                } finally {
                  setCreatedLoading(false);
                }
              }}
            >
              {createdLoading ? "Consultando..." : "Consultar status no Graph"}
            </button>
            <div className="muted" style={{ fontWeight: 800 }}>
              {isRealMetaId(created.metaCampaign?.id)
                ? "Usa `GET /api/meta/campaigns/:id` via backend."
                : "STUB não consulta Graph."}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, marginTop: 16 }}>
        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Campanhas PAUSED na Meta (Ads Manager)</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              {metaLoading ? "Carregando..." : `${metaCampaigns.length} item(ns)`}
            </div>
          </div>
          <div className="muted" style={{ fontWeight: 800 }}>Token continua apenas no backend.</div>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
          <table className="dataTable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Meta Campaign ID</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Effective</th>
                <th>Objective</th>
              </tr>
            </thead>
            <tbody>
              {metaCampaigns.map((c) => (
                <tr key={c.id}>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {c.id}
                  </td>
                  <td style={{ fontWeight: 900 }}>{c.name || "—"}</td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {c.status || "—"}
                  </td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {c.effective_status || "—"}
                  </td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {c.objective || "—"}
                  </td>
                </tr>
              ))}
              {!metaCampaigns.length ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ fontWeight: 800 }}>
                    {metaLoading
                      ? "Carregando..."
                      : "Vazio. Preencha `act_...` e clique em “Listar PAUSED na Meta”."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Etapa 2 — AdSet (preparação)</div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          Estrutura preparada no backend para `POST /api/meta/adsets` (ainda não implementado).
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Etapa 3 — Ad (preparação)</div>
        <div className="muted" style={{ marginTop: 8, fontWeight: 800, lineHeight: 1.55 }}>
          Estrutura preparada no backend para `POST /api/meta/ads` (ainda não implementado).
        </div>
      </div>
    </PageShell>
  );
}
