import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { workflowApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import MethodBadge from '../components/MethodBadge';

export default function WorkflowList() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    workflowApi.list().then((res) => {
      setWorkflows(res.data.data);
      setLoading(false);
    });
  }

  async function handleDelete(id, slug) {
    if (!window.confirm(`Delete "${slug}"? This removes every version and cannot be undone.`)) return;
    await workflowApi.remove(id);
    refresh();
  }

  return (
    <div style={{ padding: '28px 36px' }}>
      <PageHeader
        title="Workflows"
        subtitle="Every API you've defined through configuration, ready to run."
        actions={
          <Link to="/workflows/new" className="btn btn-primary">
            + New Workflow
          </Link>
        }
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {workflows.length === 0 && !loading ? (
          <div className="empty-state">
            No workflows yet. <Link to="/workflows/new">Build your first API</Link> or ask the{' '}
            <Link to="/ai-assistant">AI Assistant</Link> to generate one.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Endpoint</th>
                <th>Description</th>
                <th>Version</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((w) => (
                <tr key={w.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/workflows/${w.id}`)}>
                  <td><MethodBadge method={w.method} /></td>
                  <td className="mono">/run/{w.slug}</td>
                  <td style={{ color: 'var(--text-mid)', maxWidth: 320 }}>{w.description}</td>
                  <td>v{w.activeVersion ?? '—'} <span style={{ color: 'var(--text-low)' }}>({w.versionCount} total)</span></td>
                  <td>
                    <span className={`badge ${w.activeVersion != null ? 'badge-teal' : 'badge-muted'}`}>
                      {w.activeVersion != null ? 'published' : 'draft'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Link className="btn btn-ghost btn-sm" to={`/workflows/${w.id}/edit`}>Edit</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(w.id, w.slug)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
