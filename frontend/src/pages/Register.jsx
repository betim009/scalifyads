import PageShell from "../components/PageShell.jsx";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { register } from "../services/auth.js";

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export default function Register() {
  const location = useLocation();
  const navigate = useNavigate();

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const raw = normalizeNonEmptyString(params.get("next"));
    return raw || "/campaign-flow";
  }, [location.search]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await register({ username, password });
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao registrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell title="Register" subtitle="Criar usuário interno (simples)" align="center" backFallbackTo="/login">
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <section className="card" style={{ padding: 22 }}>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Usuário</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: operador1"
                disabled={submitting}
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
              <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Senha</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="defina uma senha"
                disabled={submitting}
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

            {error ? (
              <div className="card" style={{ padding: 12, borderColor: "#fecaca", color: "#991b1b" }}>
                <div style={{ fontWeight: 900 }}>{error}</div>
              </div>
            ) : null}

            <button type="submit" className="pillPrimary" disabled={submitting}>
              {submitting ? "Criando..." : "Criar"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <Link to={`/login?next=${encodeURIComponent(nextPath)}`} style={{ fontWeight: 800 }}>
                Voltar ao login
              </Link>
              <Link to="/profile" style={{ fontWeight: 800 }}>
                Perfil
              </Link>
            </div>
          </form>
        </section>
      </div>
    </PageShell>
  );
}

