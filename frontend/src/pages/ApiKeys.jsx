import { useEffect, useState } from 'react';
import { authApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [label, setLabel] = useState('');
  const [freshKey, setFreshKey] = useState(null);

  useEffect(() => { refresh(); }, []);
  function refresh() { authApi.listApiKeys().then((r) => setKeys(r.data.data)); }

  async function create() {
    const res = await authApi.createApiKey(label || 'Unnamed key');
    setFreshKey(res.data.data.key);
    setLabel('');
    refresh();
  }

  async function revoke(id) {
    await authApi.revokeApiKey(id);
    refresh();
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 760 }}>
      <PageHeader title="API Keys" subtitle="Used by endpoints configured with API-Key authentication (sent as the X-API-Key header)." />

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="input" placeholder="Label, e.g. 'partner integration'" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button className="btn btn-primary" onClick={create}>Generate key</button>
        </div>

        {freshKey && (
          <div style={{ marginTop: 14, padding: 12, background: 'var(--teal-dim)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--teal)', marginBottom: 6 }}>Copy this now — it won't be shown again:</div>
            <code style={{ fontSize: 13 }}>{freshKey}</code>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {keys.length === 0 ? <div className="empty-state">No API keys yet.</div> : (
          <table className="data-table">
            <thead><tr><th>Label</th><th>Key</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.label}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{k.key}</td>
                  <td><span className={`badge ${k.active ? 'badge-teal' : 'badge-muted'}`}>{k.active ? 'active' : 'revoked'}</span></td>
                  <td>{k.active && <button className="btn btn-danger btn-sm" onClick={() => revoke(k.id)}>Revoke</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
