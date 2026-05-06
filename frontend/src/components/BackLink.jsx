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
      className="backLink"
      aria-label="Voltar"
    >
      <ArrowBackIcon fontSize="small" />
      {label}
    </button>
  );
}
