import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { listGeneratedCampaigns } from "../services/generatedCampaigns.js";
import { createMetaCampaign } from "../services/meta.js";
import StatusBadge from "../components/StatusBadge.jsx";
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

function isRealMetaId(metaCampaignId) {
  const id = normalizeNonEmptyString(metaCampaignId);
  return Boolean(id) && !id.startsWith("stub-");
}

export default function MetaPausedTest() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generated, setGenerated] = useState([]);

  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await listGeneratedCampaigns({ limit: 200 });
      setGenerated(res.generatedCampaigns ?? []);
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao carregar campanhas geradas.");
      setGenerated([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const realCampaigns = useMemo(
    () => generated.filter((gc) => isRealMetaId(gc.meta_campaign_id)),
    [generated],
  );

  const stubOrUnlinked = useMemo(
    () => generated.filter((gc) => !isRealMetaId(gc.meta_campaign_id)),
    [generated],
  );

  const canCreate = normalizeNonEmptyString(metaAdAccountId) !== "" && normalizeNonEmptyString(objective) !== "";

  return (
    <PageShell
      title="Teste Meta (REAL + PAUSED)"
      subtitle="Página isolada de teste — não altera o fluxo principal"
      backFallbackTo="/configuracoes"
    >
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontWeight: 900 }}>Regras</div>
        <ul className="muted" style={{ marginTop: 10, fontWeight: 800, lineHeight: 1.55 }}>
          <li>Esta página NÃO envia token para o frontend.</li>
          <li>O backend deve ter token via `META_ACCESS_TOKEN` ou `POST /api/meta/tokens`.</li>
          <li>Toda campanha criada aqui deve nascer obrigatoriamente como `PAUSED` (forçado no backend).</li>
        </ul>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Configuração do teste</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              Preencha a Ad Account e o objetivo, depois clique em “Criar REAL (PAUSED)” em uma linha abaixo.
            </div>
          </div>
          <button type="button" className="pillOutline" onClick={refresh} disabled={loading || busyId !== null}>
            Atualizar
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>
              Objective (quando não existir no banco)
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
      </div>

      <div className="card" style={{ padding: 0, marginTop: 16 }}>
        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Pendentes / STUB (não-real)</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              {loading ? "Carregando..." : `${stubOrUnlinked.length} item(ns)`}
            </div>
          </div>
          <div className="muted" style={{ fontWeight: 800 }}>
            Clique em “Criar REAL (PAUSED)” para criar na Meta via backend.
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
          <table className="dataTable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>País</th>
                <th>Nome</th>
                <th>Status (local)</th>
                <th>Meta Campaign ID</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {stubOrUnlinked.map((gc) => (
                <tr key={gc.id}>
                  <td style={{ fontWeight: 900 }}>
                    <span style={{ marginRight: 10 }} aria-hidden="true">
                      {countryCodeToFlag(gc.country_code)}
                    </span>
                    {gc.country_code}
                  </td>
                  <td style={{ fontWeight: 900 }}>{gc.name}</td>
                  <td style={{ fontWeight: 900 }}>
                    <StatusBadge>{gc.status || "—"}</StatusBadge>
                  </td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {gc.meta_campaign_id || "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="pillOutline"
                      disabled={!canCreate || busyId !== null || loading}
                      onClick={async () => {
                        setBusyId(gc.id);
                        setError("");
                        setSuccess("");
                        try {
                          const res = await createMetaCampaign({
                            generatedCampaignId: gc.id,
                            metaAdAccountId: metaAdAccountId.trim(),
                            objective: objective.trim(),
                          });
                          const id = res?.metaCampaign?.id ? String(res.metaCampaign.id) : "";
                          const status = res?.metaCampaign?.status ? String(res.metaCampaign.status) : "—";
                          const effective = res?.metaCampaign?.effective_status ? String(res.metaCampaign.effective_status) : "—";
                          setSuccess(`Criada na Meta: ${id} (status=${status} / effective_status=${effective}).`);
                          await refresh();
                        } catch (err) {
                          setError(err?.message ? String(err.message) : "Falha ao criar campanha real na Meta.");
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      {busyId === gc.id ? "Criando..." : "Criar REAL (PAUSED)"}
                    </button>
                  </td>
                </tr>
              ))}
              {!stubOrUnlinked.length ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ fontWeight: 800 }}>
                    {loading ? "Carregando..." : "Nenhuma campanha pendente/stub encontrada."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 16 }}>
        <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>REAL (persistidas)</div>
            <div className="muted" style={{ marginTop: 6, fontWeight: 800 }}>
              {loading ? "Carregando..." : `${realCampaigns.length} item(ns)`}
            </div>
          </div>
          <div className="muted" style={{ fontWeight: 800 }}>
            Esperado: `meta_status` / `meta_effective_status` = PAUSED no Ads Manager.
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
          <table className="dataTable" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>País</th>
                <th>Nome</th>
                <th>Meta Campaign ID</th>
                <th>Status Meta</th>
              </tr>
            </thead>
            <tbody>
              {realCampaigns.map((gc) => (
                <tr key={gc.id}>
                  <td style={{ fontWeight: 900 }}>
                    <span style={{ marginRight: 10 }} aria-hidden="true">
                      {countryCodeToFlag(gc.country_code)}
                    </span>
                    {gc.country_code}
                  </td>
                  <td style={{ fontWeight: 900 }}>{gc.name}</td>
                  <td className="muted" style={{ fontWeight: 800 }}>
                    {gc.meta_campaign_id}
                  </td>
                  <td className="muted" style={{ fontWeight: 900 }}>
                    {gc.meta_status || gc.meta_effective_status
                      ? `${gc.meta_status || "—"}${gc.meta_effective_status && gc.meta_effective_status !== gc.meta_status ? ` / ${gc.meta_effective_status}` : ""}`
                      : "—"}
                  </td>
                </tr>
              ))}
              {!realCampaigns.length ? (
                <tr>
                  <td colSpan={4} className="muted" style={{ fontWeight: 800 }}>
                    {loading ? "Carregando..." : "Nenhuma campanha REAL persistida ainda."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}

