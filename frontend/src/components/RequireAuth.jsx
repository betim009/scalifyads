import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import PageShell from "./PageShell.jsx";
import { getAuthMe } from "../services/auth.js";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, authenticated: false });

  useEffect(() => {
    let alive = true;
    getAuthMe()
      .then((res) => {
        if (!alive) return;
        setState({ loading: false, authenticated: Boolean(res?.authenticated) });
      })
      .catch(() => {
        if (!alive) return;
        setState({ loading: false, authenticated: false });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) {
    return (
      <PageShell title="Carregando..." subtitle="Verificando login" align="center" backFallbackTo="/">
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <section className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 800, color: "#374151" }}>Aguarde.</div>
          </section>
        </div>
      </PageShell>
    );
  }

  if (!state.authenticated) {
    const next = `${location.pathname}${location.search || ""}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}

