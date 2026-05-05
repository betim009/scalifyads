function IconGlobe(props) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M2 12h20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 2c2.6 2.9 4 6.4 4 10s-1.4 7.1-4 10c-2.6-2.9-4-6.4-4-10s1.4-7.1 4-10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUser(props) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconCalendar(props) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M7 3v3M17 3v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 9h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function IconDollar(props) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2v20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 7.5c0-2-2-3.5-5-3.5S7 5.5 7 7.5c0 4 10 2 10 6 0 2-2 3.5-5 3.5s-5-1.5-5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGear(props) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a8.5 8.5 0 0 0 .1-2l2-1.2-2-3.4-2.3.6a8.5 8.5 0 0 0-1.7-1l-.3-2.4h-4l-.3 2.4a8.5 8.5 0 0 0-1.7 1L4.6 8.4l-2 3.4 2 1.2a8.5 8.5 0 0 0 .1 2l-2 1.2 2 3.4 2.3-.6a8.5 8.5 0 0 0 1.7 1l.3 2.4h4l.3-2.4a8.5 8.5 0 0 0 1.7-1l2.3.6 2-3.4-2-1.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TopPillButton({ active, icon, children }) {
  return (
    <button
      type="button"
      className={`pillButton${active ? " pillButtonActive" : ""}`}
    >
      <span className="pillButtonIcon">{icon}</span>
      {children}
    </button>
  );
}

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
              <IconGlobe style={{ color: "#ffffff" }} />
            </div>
            <div>
              <h1 className="brandTitle">Campaign Builder</h1>
              <p className="brandSubtitle">Automação global de campanhas</p>
            </div>
          </div>

          <nav className="topNav" aria-label="Navegação principal">
            <TopPillButton icon={<IconUser />} active={false}>
              Conta Global
            </TopPillButton>
            <TopPillLink to="/" icon={<IconCalendar />}>
              Mensal
            </TopPillLink>
            <TopPillLink to="/financeiro" icon={<IconDollar />}>
              Financeiro
            </TopPillLink>
            <TopPillLink to="/configuracoes" icon={<IconGear />}>
              Configurações
            </TopPillLink>
          </nav>
        </div>
      </div>
    </header>
  );
}
import { NavLink } from "react-router-dom";

