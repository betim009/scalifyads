import { useNavigate } from "react-router-dom";

export default function BackLink({ fallbackTo = "/" }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          navigate(-1);
          return;
        }
        navigate(fallbackTo);
      }}
      style={{
        background: "transparent",
        border: 0,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        color: "#6b7280",
        fontWeight: 600,
        fontSize: 18,
        cursor: "pointer",
      }}
      aria-label="Voltar"
    >
      <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>
        ←
      </span>
      Voltar
    </button>
  );
}

