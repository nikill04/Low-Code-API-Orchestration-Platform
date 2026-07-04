import { useState } from 'react';
import { workflowApi } from '../api/endpoints';
import StatusBadge from './StatusBadge';

export default function TestRunModal({ definition, onClose, onTraceUpdate }) {
  const [body, setBody] = useState('{}');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setError('');
    setRunning(true);
    setResult(null);
    try {
      const input = { body: JSON.parse(body), query: {}, params: {}, headers: {} };
      const { data } = await workflowApi.testRun(definition, input);
      setResult(data.data);
      onTraceUpdate && onTraceUpdate(data.data.trace);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div className="card" style={{ width: 640, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16 }}>Test run</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="field">
          <label className="label">Request body (JSON)</label>
          <textarea className="textarea" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        <button className="btn btn-primary" onClick={run} disabled={running} style={{ alignSelf: 'flex-start' }}>
          {running ? 'Running…' : '▶ Run'}
        </button>

        {error && <div style={{ color: 'var(--rose)', marginTop: 12, fontSize: 13 }}>{error}</div>}

        {result && (
          <div style={{ marginTop: 16, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <StatusBadge status={result.success ? 'success' : 'error'} />
              <span style={{ fontSize: 12, color: 'var(--text-low)' }}>{result.durationMs}ms · {result.requestId}</span>
            </div>

            <div className="label">Step trace</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {result.trace.map((t) => (
                <div key={t.stepId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 10px', background: 'var(--ink-800)', borderRadius: 6 }}>
                  <span className="mono">{t.stepId} <span style={{ color: 'var(--text-low)' }}>({t.type})</span></span>
                  <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-low)' }}>{t.durationMs ?? 0}ms</span>
                    <StatusBadge status={t.status} />
                  </span>
                </div>
              ))}
            </div>

            <div className="label">{result.success ? 'Response' : 'Error'}</div>
            <pre className="mono" style={{ background: 'var(--ink-800)', padding: 12, borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
              {JSON.stringify(result.success ? result.response : result.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(6,9,15,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
};
