import { useState } from 'react';

const FIELD_TYPES = ['string', 'number', 'boolean'];

export default function SettingsPanel({ definition, onChange }) {
  function patch(partial) {
    onChange({ ...definition, ...partial });
  }

  const bodyFields = Object.entries(definition.inputSchema?.body || {});

  function updateField(name, updates) {
    const body = { ...(definition.inputSchema?.body || {}) };
    body[name] = { ...body[name], ...updates };
    patch({ inputSchema: { ...definition.inputSchema, body } });
  }

  function renameField(oldName, newName) {
    if (!newName || newName === oldName) return;
    const body = { ...(definition.inputSchema?.body || {}) };
    body[newName] = body[oldName];
    delete body[oldName];
    patch({ inputSchema: { ...definition.inputSchema, body } });
  }

  function addField() {
    const name = `field${bodyFields.length + 1}`;
    updateField(name, { type: 'string', required: true });
  }

  function removeField(name) {
    const body = { ...(definition.inputSchema?.body || {}) };
    delete body[name];
    patch({ inputSchema: { ...definition.inputSchema, body } });
  }

  return (
    <div style={{ padding: 18 }}>
      <div className="field">
        <label className="label">Endpoint slug</label>
        <input className="input mono" value={definition.slug || ''} onChange={(e) => patch({ slug: e.target.value.trim() })} placeholder="verify-pan" />
        <div style={{ fontSize: 11.5, color: 'var(--text-low)', marginTop: 5 }}>Published at /api/v1/run/{definition.slug || '…'}</div>
      </div>

      <div className="field">
        <label className="label">HTTP Method</label>
        <select className="select" value={definition.method || 'POST'} onChange={(e) => patch({ method: e.target.value })}>
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>

      <div className="field">
        <label className="label">Description</label>
        <textarea className="textarea" style={{ fontFamily: 'var(--font-body)' }} rows={2} value={definition.description || ''} onChange={(e) => patch({ description: e.target.value })} />
      </div>

      <div className="field">
        <label className="label">Authentication</label>
        <select className="select" value={definition.auth?.type || 'none'} onChange={(e) => patch({ auth: { type: e.target.value } })}>
          <option value="none">None — public endpoint</option>
          <option value="apiKey">API Key (X-API-Key header)</option>
          <option value="jwt">JWT bearer token</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="label">Rate limit (requests)</label>
          <input className="input" type="number" min={1} value={definition.rateLimit?.max ?? ''} placeholder="unlimited"
            onChange={(e) => patch({ rateLimit: e.target.value ? { ...definition.rateLimit, max: Number(e.target.value), windowMs: definition.rateLimit?.windowMs || 60000 } : undefined })} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="label">Per window (ms)</label>
          <input className="input" type="number" min={1000} disabled={!definition.rateLimit} value={definition.rateLimit?.windowMs ?? 60000}
            onChange={(e) => patch({ rateLimit: { ...definition.rateLimit, windowMs: Number(e.target.value) } })} />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={Boolean(definition.webhook?.onComplete)} onChange={(e) => patch({ webhook: { onComplete: e.target.checked } })} />
        <span className="label" style={{ margin: 0 }}>Fire webhook subscribers when execution completes</span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={Boolean(definition.debug)} onChange={(e) => patch({ debug: e.target.checked })} />
        <span className="label" style={{ margin: 0 }}>Include step trace in the API response (useful while building)</span>
      </label>

      <hr className="divider" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="label" style={{ margin: 0 }}>Request body schema</span>
        <button className="btn btn-ghost btn-sm" onClick={addField}>+ Add field</button>
      </div>

      {bodyFields.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-low)' }}>No fields declared — any body will be accepted.</div>}

      {bodyFields.map(([name, rule]) => (
        <div key={name} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          <input className="input mono" style={{ flex: 1.2 }} defaultValue={name} onBlur={(e) => renameField(name, e.target.value.trim())} />
          <select className="select" style={{ flex: 1 }} value={rule.type} onChange={(e) => updateField(name, { type: e.target.value })}>
            {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={Boolean(rule.required)} onChange={(e) => updateField(name, { required: e.target.checked })} /> req
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => removeField(name)}>✕</button>
        </div>
      ))}

      {bodyFields.some(([, rule]) => rule.type === 'string') && (
        <div style={{ fontSize: 11, color: 'var(--text-low)', marginTop: 4 }}>
          Tip: add a <code>pattern</code> via the raw JSON view for regex-validated fields like PAN/Aadhaar numbers.
        </div>
      )}
    </div>
  );
}
