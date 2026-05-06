import { DownloadIcon } from "../styles/icons.js";

export default function ExportButton({ children }) {
  return (
    <button type="button" className="exportButton">
      <DownloadIcon fontSize="small" />
      {children}
    </button>
  );
}
