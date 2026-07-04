import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { workflowApi } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import MethodBadge from '../components/MethodBadge';
import StatusBadge from '../components/StatusBadge';

const TABS = ['Overview', 'Versions', 'Schedule', 'Webhooks', 'Logs'];

export default function WorkflowDetail() {
  const { id } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [versions, setVersions] = useState([]);
  const [tab, setTab] = useState('Overview');

  useEffect(() => {
    refresh();
  }, [id]);

  function refresh() {
    workflowApi.get(id).then((res) => {
      setWorkflow(res.data.data.workflow);
      setVersions(res.data.data.versions);
    });
  }

  if (!workflow) return <div style={{ padding: 32 }}>Loading…</div>;
  const activeDefinition = versions.find((v) => v.version === workflow.activeVersion)?.definition;

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1000 }}>
      <PageHeader
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MethodBadge method={workflow.method} /> <span className="mono">/run/{workflow.slug}</span>
          </span>
        }
        subtitle={workflow.description}
        actions={<Link className="btn btn-primary" to={`/workflows/${id}/edit`}>Edit workflow</Link>}
      />

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="btn-ghost"
            style={{
              border: 'none', background: 'none', padding: '10px 14px', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--teal)' : '2px solid transparent',
              color: tab === t ? 'var(--text-hi)' : 'var(--text-mid)', fontWeight: 500, fontSize: 13.5,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab workflow={workflow} definition={activeDefinition} />}
      {tab === 'Versions' && <VersionsTab workflowId={id} versions={versions} activeVersion={workflow.activeVersion} onChange={refresh} />}
      {tab === 'Schedule' && <ScheduleTab workflowId={id} />}
      {tab === 'Webhooks' && <WebhooksTab workflowId={id} />}
      {tab === 'Logs' && <LogsTab workflowId={id} />}
    </div>
  );
}

function OverviewTab({ workflow, definition }) {
  if (!definition) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card">
        <div className="label">Authentication</div>
        <p style={{ marginTop: 4, fontSize: 14 }}>{definition.auth?.type === 'none' ? 'Public — no auth required' : definition.auth?.type === 'apiKey' ? 'API Key (X-API-Key header)' : 'JWT bearer token'}</p>
        <div className="label" style={{ marginTop: 16 }}>Rate limit</div>
        <p style={{ marginTop: 4, fontSize: 14 }}>{definition.rateLimit ? `${definition.rateLimit.max} requests / ${definition.rateLimit.windowMs}ms` : 'Unlimited (uses global limit only)'}</p>
        <div className="label" style={{ marginTop: 16 }}>Steps</div>
        <p style={{ marginTop: 4, fontSize: 14 }}>{definition.steps.length} step(s), active version v{workflow.activeVersion}</p>
      </div>
      <div className="card">
        <div className="label">Definition (read-only)</div>
        <pre className="mono" style={{ fontSize: 11.5, background: 'var(--ink-800)', padding: 12, borderRadius: 8, maxHeight: 320, overflow: 'auto', marginTop: 8 }}>
          {JSON.stringify(definition, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function VersionsTab({ workflowId, versions, activeVersion, onChange }) {
  async function activate(version) {
    await workflowApi.activateVersion(workflowId, version);
    onChange();
  }
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="data-table">
        <thead><tr><th>Version</th><th>Created</th><th>Steps</th><th></th></tr></thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.id}>
              <td>v{v.version} {v.version === activeVersion && <span className="badge badge-teal" style={{ marginLeft: 8 }}>active</span>}</td>
              <td style={{ color: 'var(--text-mid)' }}>{new Date(v.createdAt).toLocaleString()}</td>
              <td>{v.definition.steps.length}</td>
              <td>
                {v.version !== activeVersion && (
                  <button className="btn btn-ghost btn-sm" onClick={() => activate(v.version)}>Activate</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleTab({ workflowId }) {
  const [jobs, setJobs] = useState([]);
  const [cron, setCron] = useState('*/5 * * * *');
  const [payload, setPayload] = useState('{}');

  useEffect(() => { refresh(); }, [workflowId]);
  function refresh() { workflowApi.listSchedules(workflowId).then((r) => setJobs(r.data.data)); }

  async function create() {
    try {
      await workflowApi.schedule(workflowId, cron, JSON.parse(payload));
      refresh();
    } catch (e) {
      alert('Invalid cron expression or payload JSON');
    }
  }
  async function remove(jobId) {
    await workflowApi.deleteSchedule(jobId);
    refresh();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
      <div className="card">
        <div className="label">New scheduled run</div>
        <div className="field" style={{ marginTop: 10 }}>
          <label className="label">Cron expression</label>
          <input className="input mono" value={cron} onChange={(e) => setCron(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Payload (sent as request body)</label>
          <textarea className="textarea" rows={4} value={payload} onChange={(e) => setPayload(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={create}>Schedule</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {jobs.length === 0 ? <div className="empty-state">No scheduled runs yet.</div> : (
          <table className="data-table">
            <thead><tr><th>Cron</th><th>Payload</th><th></th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="mono">{j.cronExpression}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{JSON.stringify(j.payload)}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(j.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function WebhooksTab({ workflowId }) {
  const [subs, setSubs] = useState([]);
  const [url, setUrl] = useState('http://localhost:4000/mock/webhook/receive');

  useEffect(() => { refresh(); }, [workflowId]);
  function refresh() { workflowApi.listWebhooks(workflowId).then((r) => setSubs(r.data.data)); }

  async function create() {
    await workflowApi.subscribeWebhook(workflowId, url, 'execution.completed');
    refresh();
  }
  async function remove(subId) {
    await workflowApi.deleteWebhook(subId);
    refresh();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
      <div className="card">
        <div className="label">Subscribe a URL</div>
        <p style={{ fontSize: 12.5, color: 'var(--text-mid)', margin: '6px 0 12px' }}>
          Fires an <code>execution.completed</code> event whenever this API runs (remember to enable it under the workflow's Settings too).
        </p>
        <div className="field">
          <input className="input mono" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={create}>Subscribe</button>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {subs.length === 0 ? <div className="empty-state">No subscribers yet.</div> : (
          <table className="data-table">
            <thead><tr><th>URL</th><th>Event</th><th></th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="mono" style={{ fontSize: 12 }}>{s.url}</td>
                  <td>{s.event}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LogsTab({ workflowId }) {
  const [logs, setLogs] = useState([]);
  useEffect(() => { workflowApi.logs(workflowId).then((r) => setLogs(r.data.data)); }, [workflowId]);

  return (
    <div className="card" style={{ padding: 0 }}>
      {logs.length === 0 ? <div className="empty-state">No executions recorded for this workflow yet.</div> : (
        <table className="data-table">
          <thead><tr><th>Time</th><th>Status</th><th>Duration</th><th>Request ID</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={{ color: 'var(--text-mid)' }}>{new Date(l.startedAt).toLocaleString()}</td>
                <td><StatusBadge status={l.success ? 'success' : 'error'} /></td>
                <td>{l.durationMs}ms</td>
                <td className="mono" style={{ fontSize: 11.5 }}>{l.requestId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
