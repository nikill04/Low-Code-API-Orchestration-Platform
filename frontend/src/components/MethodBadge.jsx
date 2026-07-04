const COLORS = {
  GET: 'badge-indigo',
  POST: 'badge-teal',
  PUT: 'badge-amber',
  PATCH: 'badge-amber',
  DELETE: 'badge-rose',
};

export default function MethodBadge({ method }) {
  return <span className={`badge ${COLORS[method] || 'badge-muted'}`}>{method}</span>;
}
