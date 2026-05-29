export default function StatusPill({ tone = "muted", children, title }) {
  const cls = `statusPill statusPill${String(tone || "muted").slice(0, 1).toUpperCase()}${String(tone || "muted").slice(1)}`;
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}

