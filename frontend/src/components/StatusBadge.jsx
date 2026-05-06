import { CheckCircleIcon, EditIcon } from "../styles/icons.js";

export default function StatusBadge({ children }) {
  const label = String(children ?? "");
  const isDraft = label.toLowerCase().includes("rascunho");

  return (
    <span className="statusBadge">
      {isDraft ? (
        <EditIcon fontSize="small" style={{ color: "#6b7280" }} />
      ) : (
        <CheckCircleIcon fontSize="small" style={{ color: "#16a34a" }} />
      )}
      {children}
    </span>
  );
}
