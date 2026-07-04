import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { metricsApi, workflowApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import MethodBadge from '../components/MethodBadge';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [metricsRes, workflowsRes] = await Promise.all([metricsApi.get(), workflowApi.list()]);
    setMetrics(metricsRes.data.data);
    setWorkflows(workflowsRes.data.data);

    // pull a small combined feed of recent logs across the first few workflows
    const logBatches = await Promise.all(
      workflowsRes.data.data.slice(0, 5).map((w) => workflowApi.logs(w.id).then((r) => r.data.data))
    );
    const combined = logBatches
      .flat()
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, 8);
    setRecentLogs(combined);
    setLoading(false);
  }

  const successRate = metrics && metrics.total > 0 ? Math.round((metrics.successCount / metrics.total) * 100) : null;

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1100 }}>
      <PageHeader
        title="Dashboard"
        subtitle="A quick read on what your orchestration layer has been doing."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Published APIs" value={workflows.filter((w) => w.activeVersion != null).length} accent="teal" />
        <StatCard label="Total Executions" value={metrics?.total ?? '—'} accent="indigo" />
        <StatCard label="Success Rate" value={successRate !== null ? `${successRate}%` : '—'} accent="amber" />
        <StatCard label="Avg Latency" value={metrics ? `${metrics.avgDurationMs}ms` : '—'} accent="violet" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15 }}>Your APIs</h3>
            <Link to="/workflows" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          {workflows.length === 0 && !loading && (
            <div className="empty-state">
              No workflows yet. <Link to="/workflows/new">Create your first one</Link>.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {workflows.slice(0, 6).map((w) => (
              <Link
                key={w.id}
                to={`/workflows/${w.id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MethodBadge method={w.method} />
                  <span className="mono" style={{ fontSize: 13 }}>/run/{w.slug}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-low)' }}>
                  {w.activeVersion ? `v${w.activeVersion}` : 'draft'}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>Recent Executions</h3>
          {recentLogs.length === 0 && <div className="empty-state">Nothing has run yet.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <span className="mono" style={{ color: 'var(--text-mid)' }}>{log.slug}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--text-low)', fontSize: 12 }}>{log.durationMs}ms</span>
                  <StatusBadge status={log.success ? 'success' : 'error'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="card" style={{ borderTop: `2px solid var(--${accent})` }}>
      <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-low)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
