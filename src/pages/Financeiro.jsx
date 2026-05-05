import BackLink from "../components/BackLink.jsx";

export default function Financeiro() {
  return (
    <>
      <main style={{ background: "#ffffff" }}>
        <div className="container" style={{ paddingTop: 24 }}>
          <BackLink />
          <div style={{ marginTop: 26 }}>
            <h1 style={{ fontSize: 56, margin: 0, letterSpacing: "-0.02em" }}>
              Financeiro
            </h1>
            <p
              className="muted"
              style={{ margin: "8px 0 0", fontSize: 20, fontWeight: 500 }}
            >
              Acompanhe os gastos e performance das campanhas
            </p>
          </div>
        </div>
      </main>

      <section className="page" style={{ marginTop: 22 }}>
        <div className="container">
          <div className="card" style={{ padding: 24 }}>
            <p className="muted" style={{ margin: 0 }}>
              Conteúdo em construção.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
