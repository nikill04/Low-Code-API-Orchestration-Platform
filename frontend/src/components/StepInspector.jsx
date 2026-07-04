import { useEffect, useState } from 'react';

// Small helper: keeps a JSON textarea in sync with an object field on the
// step, without blowing up the whole form the moment the user types a
// temporarily-invalid character. Parsing only happens on blur.
function JsonField({ label, value, onCommit, rows = 4 }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(JSON.stringify(value ?? {}, null, 2));
    setInvalid(false);
  }, [value]);

  return (
    <div className="field">
      <label className="label">{label}</label>
      <textarea
        className="textarea"
        rows={rows}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          try {
            const parsed = JSON.parse(text);
            setInvalid(false);
            onCommit(parsed);
          } catch {
            setInvalid(true);
          }
        }}
        style={{ borderColor: invalid ? 'var(--rose)' : undefined }}
      />
      {invalid && <div style={{ fontSize: 11.5, color: 'var(--rose)', marginTop: 4 }}>Not valid JSON — edit not applied yet.</div>}
    </div>
  );
}

export default function StepInspector({ step, plugins, onChange, onDelete, onClose }) {
  if (!step) return null;

  function patch(partial) {
    onChange({ ...step, ...partial });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
        <div>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: 'var(--text-low)', letterSpacing: '0.06em' }}>Step</div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{step.id}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        <div className="field">
          <label className="label">Step ID</label>
          <input className="input mono" value={step.id} onChange={(e) => patch({ id: e.target.value })} />
        </div>

        <div className="field">
          <label className="label">On error</label>
          <select className="select" value={step.onError || 'fail'} onChange={(e) => patch({ onError: e.target.value })}>
            <option value="fail">Fail the whole workflow</option>
            <option value="continue">Continue (mark step as errored)</option>
          </select>
        </div>

        <hr className="divider" />

        {step.type === 'http' && <HttpStepFields step={step} patch={patch} />}
        {step.type === 'transform' && <TransformStepFields step={step} patch={patch} plugins={plugins} />}
        {step.type === 'parallel' && (
          <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>
            This is a parallel group. Click one of its chips on the canvas node to edit that nested step.
          </div>
        )}

        <hr className="divider" />

        <ConditionEditor step={step} patch={patch} />
      </div>

      <div style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={onDelete}>
          Delete step
        </button>
      </div>
    </div>
  );
}

function HttpStepFields({ step, patch }) {
  const req = step.request || {};
  function patchRequest(partial) {
    patch({ request: { ...req, ...partial } });
  }

  return (
    <>
      <div className="field">
        <label className="label">Method</label>
        <select className="select" value={req.method || 'GET'} onChange={(e) => patchRequest({ method: e.target.value })}>
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="label">URL</label>
        <input className="input mono" value={req.url || ''} onChange={(e) => patchRequest({ url: e.target.value })} placeholder="http://localhost:4000/mock/pan/verify" />
      </div>
      <JsonField label="Headers" value={req.headers} onCommit={(headers) => patchRequest({ headers })} rows={3} />
      <JsonField label="Body / Query mapping" value={req.body || req.params} onCommit={(val) => patchRequest(req.method === 'GET' ? { params: val } : { body: val })} rows={5} />

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="label">Retry attempts</label>
          <input className="input" type="number" min={1} value={step.retry?.maxAttempts ?? 1} onChange={(e) => patch({ retry: { ...step.retry, maxAttempts: Number(e.target.value) } })} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="label">Backoff (ms)</label>
          <input className="input" type="number" min={0} value={step.retry?.backoffMs ?? 250} onChange={(e) => patch({ retry: { ...step.retry, backoffMs: Number(e.target.value) } })} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="label">Timeout (ms)</label>
          <input className="input" type="number" min={100} value={step.timeoutMs ?? 5000} onChange={(e) => patch({ timeoutMs: Number(e.target.value) })} />
        </div>
      </div>

      <div className="field">
        <label className="label">Cache TTL (seconds, optional)</label>
        <input
          className="input"
          type="number"
          min={0}
          value={step.cache?.ttlSeconds ?? ''}
          placeholder="no caching"
          onChange={(e) => patch({ cache: e.target.value ? { ttlSeconds: Number(e.target.value) } : undefined })}
        />
      </div>
    </>
  );
}

function TransformStepFields({ step, patch, plugins }) {
  const pluginNames = Object.keys(plugins || {});
  const fnNames = plugins?.[step.plugin] || [];

  return (
    <>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label className="label">Plugin</label>
          <select className="select" value={step.plugin || ''} onChange={(e) => patch({ plugin: e.target.value, fn: '' })}>
            <option value="">Select…</option>
            {pluginNames.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="label">Function</label>
          <select className="select" value={step.fn || ''} onChange={(e) => patch({ fn: e.target.value })} disabled={!step.plugin}>
            <option value="">Select…</option>
            {fnNames.map((fn) => <option key={fn}>{fn}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label className="label">Input mapping</label>
        <input className="input mono" value={step.input || ''} onChange={(e) => patch({ input: e.target.value })} placeholder="{{steps.someStep.response.data.field}}" />
      </div>
      <JsonField label="Extra args" value={step.args} onCommit={(args) => patch({ args })} rows={3} />
    </>
  );
}

const OPERATORS = ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'contains', 'isTrue', 'isFalse', 'exists', 'notExists'];

function ConditionEditor({ step, patch }) {
  const [enabled, setEnabled] = useState(Boolean(step.condition));
  const cond = step.condition || { path: '', operator: 'isTrue', value: '' };

  function patchCondition(partial) {
    patch({ condition: { ...cond, ...partial } });
  }

  return (
    <div className="field">
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            patch({ condition: e.target.checked ? cond : undefined });
          }}
        />
        <span className="label" style={{ margin: 0 }}>Only run this step conditionally</span>
      </label>

      {enabled && (
        <div style={{ paddingLeft: 4 }}>
          <div className="field">
            <label className="label">Path</label>
            <input className="input mono" placeholder="steps.verifyPan.response.data.valid" value={cond.path} onChange={(e) => patchCondition({ path: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="label">Operator</label>
              <select className="select" value={cond.operator} onChange={(e) => patchCondition({ operator: e.target.value })}>
                {OPERATORS.map((op) => <option key={op}>{op}</option>)}
              </select>
            </div>
            {!['isTrue', 'isFalse', 'exists', 'notExists'].includes(cond.operator) && (
              <div className="field" style={{ flex: 1 }}>
                <label className="label">Value</label>
                <input className="input" value={cond.value ?? ''} onChange={(e) => patchCondition({ value: e.target.value })} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
