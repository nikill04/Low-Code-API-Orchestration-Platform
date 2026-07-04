import { Handle, Position } from '@xyflow/react';

export default function ResponseNode({ data, selected, id }) {
  const fieldCount = data.response ? Object.keys(data.response).length : 0;
  return (
    <div
      onClick={() => data.onClick && data.onClick(id)}
      style={{
        background: 'var(--ink-800)',
        border: `1px solid ${selected ? 'var(--indigo)' : 'var(--line)'}`,
        borderRadius: 10,
        padding: '10px 16px',
        minWidth: 200,
        textAlign: 'center',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'var(--indigo)' }} />
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--indigo)', marginBottom: 4 }}>
        Final response
      </div>
      <div style={{ fontSize: 13 }}>{fieldCount} field{fieldCount !== 1 ? 's' : ''} mapped</div>
    </div>
  );
}
