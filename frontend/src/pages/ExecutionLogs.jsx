import { Fragment, useEffect, useState } from 'react';
import { workflowApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function ExecutionLogs() {
  const [workflows, setWorkflows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workflowApi.list().then(async (res) => {
      setWorkflows(res.data.data);
      const batches = await Promise.all(res.data.data.map((w) => workflowApi.logs(w.id).then((r) => r.data.data)));
      const combined = batches.flat().sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      setLogs(combined);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ padding: '28px 36px' }}>
      <PageHeader title="Execution Logs" subtitle="Every run, across every workflow, with a full step-by-step trace." />

      <div className="card" style={{ padding: 0 }}>
        {logs.length === 0 && !loading ? (
          <div className="empty-state">No executions yet — run something from the Test Console.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Time</th><th>Workflow</th><th>Status</th><th>Duration</th><th>Request ID</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                    <td style={{ color: 'var(--text-mid)' }}>{new Date(log.startedAt).toLocaleString()}</td>
                    <td className="mono">{log.slug}</td>
                    <td><StatusBadge status={log.success ? 'success' : 'error'} /></td>
                    <td>{log.durationMs}ms</td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{log.requestId}</td>
                  </tr>
                  {expanded === log.id && (
                    <tr>
                      <td colSpan={5} style={{ background: 'var(--ink-800)' }}>
                        <div style={{ padding: '12px 6px' }}>
                          <div className="label">Step trace</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0 14px' }}>
                            {(log.trace || []).map((t) => (
                              <div key={t.stepId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                                <span className="mono">{t.stepId} ({t.type})</span>
                                <span style={{ display: 'flex', gap: 10 }}>
                                  <span style={{ color: 'var(--text-low)' }}>{t.durationMs ?? 0}ms</span>
                                  <StatusBadge status={t.status} />
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="label">{log.success ? 'Response' : 'Error'}</div>
                          <pre className="mono" style={{ fontSize: 11.5, background: 'var(--ink-900)', padding: 10, borderRadius: 6, marginTop: 6, overflowX: 'auto' }}>
                            {JSON.stringify(log.success ? log.response : log.error, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
