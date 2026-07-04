const STYLES = {
  success: { cls: 'badge-teal', dot: 'var(--teal)', label: 'success' },
  error: { cls: 'badge-rose', dot: 'var(--rose)', label: 'error' },
  skipped: { cls: 'badge-muted', dot: 'var(--text-low)', label: 'skipped' },
  partial_failure: { cls: 'badge-amber', dot: 'var(--amber)', label: 'partial' },
  pending: { cls: 'badge-indigo', dot: 'var(--indigo)', label: 'pending' },
};

export default function StatusBadge({ status }) {
  const s = STYLES[status] || STYLES.pending;
  return (
    <span className={`badge ${s.cls}`}>
      <span className="dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}
