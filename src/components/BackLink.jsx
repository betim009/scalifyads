import { useNavigate } from "react-router-dom";
import { ArrowBackIcon } from "../styles/icons.js";

export default function BackLink({ fallbackTo = "/", label = "Voltar" }) {
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
      <ArrowBackIcon fontSize="small" />
      {label}
    </button>
  );
}
