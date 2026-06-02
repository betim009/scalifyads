import Header from "./Header.jsx";
import BackLink from "./BackLink.jsx";

export default function PageShell({
  title,
  subtitle,
  showHeader = true,
  showBack = false,
  backLabel = "Voltar",
  backFallbackTo = "/",
  headerRight = null,
  align = "left",
  titleStyle,
  subtitleStyle,
  children,
}) {
  return (
    <>
      {showHeader ? <Header /> : null}
      <main style={{ background: "transparent" }}>
        <div className="container" style={{ paddingTop: 16 }}>
          {showBack ? <BackLink fallbackTo={backFallbackTo} label={backLabel} /> : null}

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <div style={{ textAlign: align === "center" ? "center" : "left", width: "100%" }}>
              <h1 className="pageTitle" style={titleStyle}>
                {title}
              </h1>
              {subtitle ? (
                <p className="pageSubtitle" style={subtitleStyle}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            {headerRight ? <div style={{ flex: "0 0 auto" }}>{headerRight}</div> : null}
          </div>
        </div>
      </main>

      <section className="page" style={{ marginTop: 16 }}>
        <div className="container">{children}</div>
      </section>
    </>
  );
}
