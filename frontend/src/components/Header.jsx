import { NavLink } from "react-router-dom";
import {
  DescriptionIcon,
  LogoutIcon,
  PersonOutlineIcon,
  PercentIcon,
  PublicIcon,
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
          <NavLink to="/" className="brand" style={{ textDecoration: "none", color: "inherit" }} aria-label="Ir para Home">
            <h1 className="brandTitle">ScalifyAds</h1>
          </NavLink>

          <nav className="topNav" aria-label="Navegação principal">
            <TopPillLink to="/templates" icon={<DescriptionIcon fontSize="small" />}>
              Templates
            </TopPillLink>
            <TopPillLink to="/templates-mercado" icon={<PublicIcon fontSize="small" />}>
              Templates Mercado
            </TopPillLink>
            <span className="pillButton pillButtonDisabled" aria-disabled="true">
              <span className="pillButtonIcon"><PercentIcon fontSize="small" /></span>
              ROI operacional
            </span>
            <TopPillLink to="/profile" icon={<PersonOutlineIcon fontSize="small" />}>
              Perfil
            </TopPillLink>
            <TopPillLink to="/logout" icon={<LogoutIcon fontSize="small" />}>
              Sair
            </TopPillLink>
          </nav>
        </div>
      </div>
    </header>
  );
}
