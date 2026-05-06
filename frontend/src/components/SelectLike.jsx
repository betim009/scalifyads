export default function SelectLike({ label, value, options, onChange, disabled }) {
  const opts = Array.isArray(options) ? options : null;
  const normalizedOptions = opts
    ? opts.map((o) => (typeof o === "string" ? { value: o, label: o } : o))
    : null;

  return (
    <div>
      <div className="fieldLabel">{label}</div>
      {normalizedOptions ? (
        <select
          className="selectLike"
          aria-label={label}
          value={value}
          onChange={onChange}
          disabled={disabled}
        >
          {normalizedOptions.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="selectLike" role="button" aria-label={label}>
          <span>{value}</span>
          <span aria-hidden="true" style={{ opacity: 0.6 }}>
            ▾
          </span>
        </div>
      )}
    </div>
  );
}
