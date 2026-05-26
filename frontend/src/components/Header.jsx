import { NavLink } from "react-router-dom";
import {
  AttachMoneyIcon,
  CalendarMonthIcon,
  DescriptionIcon,
  PersonOutlineIcon,
  PublicIcon,
  SettingsIcon,
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

          <nav className="topNav" aria-label="Navegação principal">
            <TopPillLink to="/profile" icon={<PersonOutlineIcon fontSize="small" />}>
              Perfil
            </TopPillLink>
            <TopPillLink to="/mensal" icon={<CalendarMonthIcon fontSize="small" />}>
              Mensal
            </TopPillLink>
            <TopPillLink to="/financeiro" icon={<AttachMoneyIcon fontSize="small" />}>
              Financeiro
            </TopPillLink>
            <TopPillLink to="/templates" icon={<DescriptionIcon fontSize="small" />}>
              Templates
            </TopPillLink>
            <TopPillLink to="/configuracoes" icon={<SettingsIcon fontSize="small" />}>
              Configurações
            </TopPillLink>
          </nav>
        </div>
      </div>
    </header>
  );
}
