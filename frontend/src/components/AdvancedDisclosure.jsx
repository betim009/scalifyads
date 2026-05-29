export default function AdvancedDisclosure({ summary = "Opções avançadas", children, defaultOpen = false }) {
  return (
    <details className="advancedDisclosure" defaultOpen={defaultOpen}>
      <summary className="advancedDisclosureSummary">{summary}</summary>
      <div className="advancedDisclosureBody">{children}</div>
    </details>
  );
}

