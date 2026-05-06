export default function PeriodPills({ label, options, active, onChange }) {
  return (
    <div>
      <div className="fieldLabel">{label}</div>
      <div className="periodPills" role="tablist" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`periodPill${opt === active ? " periodPillActive" : ""}`}
            role="tab"
            aria-selected={opt === active}
            onClick={() => onChange?.(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
