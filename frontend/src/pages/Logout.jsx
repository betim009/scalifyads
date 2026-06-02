import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell.jsx";
import { logout } from "../services/auth.js";

export default function Logout() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await logout();
      } catch (err) {
        if (!alive) return;
        setError(err?.message ? String(err.message) : "Falha ao sair.");
      } finally {
        if (!alive) return;
        navigate("/login", { replace: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  return (
    <PageShell title="Saindo..." subtitle="Encerrando sua sessão" align="center" showHeader={false} backFallbackTo="/">
      {error ? (
        <div className="card" style={{ padding: 18, borderColor: "#fecaca", color: "#991b1b" }}>
          <div style={{ fontWeight: 900 }}>Erro</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{error}</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 900, color: "#374151" }}>Aguarde…</div>
        </div>
      )}
    </PageShell>
  );
}
