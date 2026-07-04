import { Handle, Position } from '@xyflow/react';

export default function TriggerNode({ data }) {
  return (
    <div
      style={{
        background: 'var(--ink-800)',
        border: '1px solid var(--teal)',
        borderRadius: 10,
        padding: '10px 16px',
        minWidth: 200,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--teal)', marginBottom: 4 }}>
        Incoming request
      </div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
        {data.method || 'POST'} /run/{data.slug || '…'}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--teal)' }} />
    </div>
  );
}
