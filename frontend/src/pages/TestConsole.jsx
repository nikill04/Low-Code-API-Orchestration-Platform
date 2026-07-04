import { useEffect, useState } from 'react';
import { workflowApi, runApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import MethodBadge from '../components/MethodBadge';
import StatusBadge from '../components/StatusBadge';

export default function TestConsole() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [body, setBody] = useState('{}');
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState(null);
  const [statusCode, setStatusCode] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    workflowApi.list().then((res) => {
      const published = res.data.data.filter((w) => w.activeVersion != null);
      setWorkflows(published);
      if (published.length) setSelectedId(published[0].id);
    });
  }, []);

  const selected = workflows.find((w) => w.id === selectedId);

  async function run() {
    if (!selected) return;
    setRunning(true);
    setResponse(null);
    setStatusCode(null);
    try {
      const payload = JSON.parse(body);
      const headers = apiKey ? { 'X-API-Key': apiKey } : {};
      const res = await runApi.invoke(selected.method, selected.slug, payload, headers);
      setStatusCode(res.status);
      setResponse(res.data);
    } catch (err) {
      setStatusCode(err.response?.status || 0);
      setResponse(err.response?.data || { error: { message: err.message } });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 900 }}>
      <PageHeader title="Test Console" subtitle="Call any published endpoint exactly the way an external client would." />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="field">
          <label className="label">Endpoint</label>
          <select className="select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>{w.method} /run/{w.slug}</option>
            ))}
          </select>
        </div>

        {selected && (
          <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 14 }}>{selected.description}</div>
        )}

        <div className="field">
          <label className="label">Request body</label>
          <textarea className="textarea" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        <div className="field">
          <label className="label">X-API-Key (only needed if this endpoint requires one)</label>
          <input className="input mono" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="ok_…" />
        </div>

        <button className="btn btn-primary" onClick={run} disabled={running || !selected}>
          {running ? 'Sending…' : 'Send request'}
        </button>
      </div>

      {response && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span className="mono" style={{ fontWeight: 600 }}>{statusCode}</span>
            <StatusBadge status={response.success ? 'success' : 'error'} />
          </div>
          <pre className="mono" style={{ fontSize: 12.5, background: 'var(--ink-800)', padding: 14, borderRadius: 8, overflowX: 'auto' }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
