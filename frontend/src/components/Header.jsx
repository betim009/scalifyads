import { NavLink } from "react-router-dom";
import {
  DescriptionIcon,
  LogoutIcon,
  PersonOutlineIcon,
  PercentIcon,
  PublicIcon,
  RocketLaunchIcon,
  ScienceIcon,
} from "../styles/icons.js";

function TopPillLink({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `pillButton${isActive ? " pillButtonActive" : ""}`
      }
      style={{ textDecoration: "none" }}
    >
      <span className="pillButtonIcon">{icon}</span>
      {children}
    </NavLink>
  );
}

export default function Header() {
  return (
    <header className="appHeader">
      <div className="container">
        <div className="appHeaderInner">
          <div className="brand">
            <div className="logoBox" aria-hidden="true">
              <PublicIcon fontSize="medium" style={{ color: "#ffffff" }} />
            </div>
            <div>
              <h1 className="brandTitle">Campaign Builder</h1>
              <p className="brandSubtitle">Automação global de campanhas</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <nav className="topNav" aria-label="Navegação principal">
              <TopPillLink to="/templates" icon={<DescriptionIcon fontSize="small" />}>
                Templates
              </TopPillLink>
              <TopPillLink to="/campaign-flow" icon={<RocketLaunchIcon fontSize="small" />}>
                Fluxo de campanha
              </TopPillLink>
              <TopPillLink to="/roi-operacional" icon={<PercentIcon fontSize="small" />}>
                ROI operacional
              </TopPillLink>
              <TopPillLink to="/profile" icon={<PersonOutlineIcon fontSize="small" />}>
                Perfil
              </TopPillLink>
              <TopPillLink to="/logout" icon={<LogoutIcon fontSize="small" />}>
                Sair
              </TopPillLink>
            </nav>

            <NavLink
              to="/meta-test"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                color: "#6b7280",
                fontWeight: 850,
                fontSize: 13,
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
              }}
              title="Área técnica/diagnóstico"
            >
              <ScienceIcon fontSize="small" />
              Diagnóstico técnico
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
}
