import { Handle, Position } from '@xyflow/react';
import { summarizeStep } from '../../utils/graph';

const TYPE_COLOR = {
  http: 'var(--indigo)',
  transform: 'var(--violet)',
  parallel: 'var(--amber)',
};

const STATUS_COLOR = {
  success: 'var(--teal)',
  error: 'var(--rose)',
  skipped: 'var(--text-low)',
  partial_failure: 'var(--amber)',
};

export default function StepNode({ id, data, selected }) {
  const { step, traceStatus, onClick, onSelectNested } = data;
  const accent = TYPE_COLOR[step.type] || 'var(--text-low)';
  const statusColor = traceStatus ? STATUS_COLOR[traceStatus] : null;

  return (
    <div
      onClick={() => onClick && onClick(id)}
      style={{
        position: 'relative',
        background: 'var(--ink-800)',
        border: `1px solid ${selected ? 'var(--indigo)' : statusColor || 'var(--line)'}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 260,
        cursor: 'pointer',
        boxShadow: statusColor ? `0 0 0 1px ${statusColor}55` : 'none',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: accent }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{step.id}</span>
        <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: accent, fontWeight: 700 }}>
          {step.type}
        </span>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: step.condition ? 6 : 0 }} className="mono">
        {summarizeStep(step)}
      </div>

      {step.condition && (
        <div style={{ fontSize: 10.5, color: 'var(--amber)', marginTop: 4 }}>
          ⤷ only if {step.condition.path?.split('.').slice(-2).join('.')} {step.condition.operator}
        </div>
      )}

      {step.type === 'parallel' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {(step.steps || []).map((nested, i) => (
            <span
              key={nested.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNested && onSelectNested(id, i);
              }}
              className="mono"
              style={{
                fontSize: 10.5,
                background: 'var(--ink-700)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                padding: '3px 7px',
              }}
            >
              {nested.id}
            </span>
          ))}
        </div>
      )}

      {traceStatus && (
        <div style={{ position: 'absolute', top: -8, right: -8, width: 14, height: 14, borderRadius: '50%', background: statusColor, border: '2px solid var(--ink-950)' }} />
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: accent }} />
    </div>
  );
}
