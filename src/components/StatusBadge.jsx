export default function StatusBadge({ children }) {
  return (
    <span className="statusBadge">
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: "#22c55e",
          display: "inline-block",
          boxShadow: "0 0 0 3px rgba(34,197,94,0.15)",
        }}
      />
      {children}
    </span>
  );
}

