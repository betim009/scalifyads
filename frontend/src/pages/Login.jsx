import PageShell from "../components/PageShell.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, getAuthMe } from "../services/auth.js";

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const raw = normalizeNonEmptyString(params.get("next"));
    return raw || "/";
  }, [location.search]);

  const [username, setUsername] = useState("beto");
  const [password, setPassword] = useState("beto123");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getAuthMe()
      .then((res) => {
        if (!alive) return;
        if (res?.authenticated) navigate(nextPath, { replace: true });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [navigate, nextPath]);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await login({ username, password });
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err?.message ? String(err.message) : "Falha ao logar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Login"
      subtitle="Acesso interno controlado"
      align="center"
      showHeader={false}
      showBack
      backFallbackTo="/"
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <section className="card" style={{ padding: 22 }}>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 900, fontSize: 14, color: "#374151" }}>Usuário</div>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="beto"
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
                placeholder="••••••••"
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
              {submitting ? "Entrando..." : "Entrar"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <Link to={`/register?next=${encodeURIComponent(nextPath)}`} style={{ fontWeight: 800 }}>
                Criar conta
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
