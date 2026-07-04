import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { workflowApi } from '../api/endpoints';
import { definitionToGraph } from '../utils/graph';
import TriggerNode from '../components/nodes/TriggerNode';
import StepNode from '../components/nodes/StepNode';
import ResponseNode from '../components/nodes/ResponseNode';
import StepInspector from '../components/StepInspector';
import SettingsPanel from '../components/SettingsPanel';
import TestRunModal from '../components/TestRunModal';

const NODE_TYPES = { triggerNode: TriggerNode, stepNode: StepNode, responseNode: ResponseNode };

const BLANK_DEFINITION = {
  slug: 'new-endpoint',
  method: 'POST',
  description: '',
  auth: { type: 'none' },
  debug: true,
  inputSchema: { body: {} },
  steps: [],
  response: {},
};

let stepCounter = 1;
function freshStep(type) {
  stepCounter += 1;
  const id = `${type}Step${stepCounter}`;
  if (type === 'http') {
    return { id, type: 'http', request: { method: 'POST', url: '', headers: {}, body: {} }, retry: { maxAttempts: 2, backoffMs: 300 }, timeoutMs: 5000 };
  }
  if (type === 'transform') {
    return { id, type: 'transform', plugin: '', fn: '', input: '' };
  }
  return { id, type: 'parallel', steps: [] };
}

export default function WorkflowEditor() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [definition, setDefinition] = useState(BLANK_DEFINITION);
  const [workflowMeta, setWorkflowMeta] = useState(null);
  const [plugins, setPlugins] = useState({});
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('canvas');
  const [rawJson, setRawJson] = useState('');
  const [rawJsonError, setRawJsonError] = useState('');
  const [trace, setTrace] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    workflowApi.plugins().then((res) => setPlugins(res.data.data));
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    workflowApi.get(id).then((res) => {
      const { workflow, versions } = res.data.data;
      const activeVersion = versions.find((v) => v.version === workflow.activeVersion) || versions[0];
      setDefinition(activeVersion.definition);
      setWorkflowMeta(workflow);
    });
  }, [id, isEditing]);

  useEffect(() => {
    setRawJson(JSON.stringify(definition, null, 2));
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  function flashToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  function updateStep(stepIndex, updatedStep) {
    const steps = [...definition.steps];
    steps[stepIndex] = updatedStep;
    setDefinition({ ...definition, steps });
  }

  function updateNestedStep(parentIndex, childIndex, updatedStep) {
    const steps = [...definition.steps];
    const parent = { ...steps[parentIndex] };
    parent.steps = [...parent.steps];
    parent.steps[childIndex] = updatedStep;
    steps[parentIndex] = parent;
    setDefinition({ ...definition, steps });
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.kind === 'step') {
      setDefinition({ ...definition, steps: definition.steps.filter((_, i) => i !== selected.index) });
    } else if (selected.kind === 'nested') {
      const steps = [...definition.steps];
      const parent = { ...steps[selected.parentIndex] };
      parent.steps = parent.steps.filter((_, i) => i !== selected.childIndex);
      steps[selected.parentIndex] = parent;
      setDefinition({ ...definition, steps });
    }
    setSelected(null);
  }

  function addStep(type) {
    setDefinition({ ...definition, steps: [...definition.steps, freshStep(type)] });
  }

  const { nodes, edges } = useMemo(() => {
    const graph = definitionToGraph(definition);
    const traceMap = new Map((trace || []).map((t) => [t.stepId, t.status]));

    const nodes = graph.nodes.map((n) => {
      if (n.type === 'stepNode') {
        const stepIndex = definition.steps.findIndex((s) => (s.id || '') === n.id);
        return {
          ...n,
          selected: selected?.kind === 'step' && selected.index === stepIndex,
          data: {
            ...n.data,
            traceStatus: traceMap.get(n.id),
            onClick: () => setSelected({ kind: 'step', index: stepIndex }),
            onSelectNested: (parentId, childIndex) => {
              const parentIndex = definition.steps.findIndex((s) => s.id === parentId);
              setSelected({ kind: 'nested', parentIndex, childIndex });
            },
          },
        };
      }
      if (n.type === 'responseNode') {
        return { ...n, selected: selected?.kind === 'response', data: { ...n.data, onClick: () => setSelected({ kind: 'response' }) } };
      }
      return n;
    });

    return { nodes, edges: graph.edges };
  }, [definition, selected, trace]);

  const selectedStep = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === 'step') return definition.steps[selected.index];
    if (selected.kind === 'nested') return definition.steps[selected.parentIndex]?.steps?.[selected.childIndex];
    return null;
  }, [selected, definition]);

  const handleStepChange = useCallback(
    (updated) => {
      if (selected.kind === 'step') updateStep(selected.index, updated);
      if (selected.kind === 'nested') updateNestedStep(selected.parentIndex, selected.childIndex, updated);
    },
    [selected, definition] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function applyRawJson() {
    try {
      const parsed = JSON.parse(rawJson);
      setDefinition(parsed);
      setRawJsonError('');
      setViewMode('canvas');
    } catch (err) {
      setRawJsonError('Invalid JSON: ' + err.message);
    }
  }

  async function handleSave(activate) {
    setSaving(true);
    try {
      if (workflowMeta) {
        await workflowApi.addVersion(workflowMeta.id, definition, activate);
        flashToast(activate ? 'Published new version ✓' : 'Draft saved ✓');
      } else {
        const res = await workflowApi.create(definition, activate);
        setWorkflowMeta(res.data.data);
        flashToast(activate ? 'Published ✓' : 'Draft saved ✓');
        navigate(`/workflows/${res.data.data.id}/edit`, { replace: true });
      }
    } catch (err) {
      flashToast(err.response?.data?.error?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--ink-900)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workflows')}>← Back</button>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{definition.method} /run/{definition.slug || '…'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {toast && <span style={{ fontSize: 12.5, color: 'var(--teal)', marginRight: 8 }}>{toast}</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => setViewMode(viewMode === 'canvas' ? 'json' : 'canvas')}>
            {viewMode === 'canvas' ? '{ } View JSON' : '⌘ View Canvas'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowTestModal(true)}>▶ Test</button>
          <button className="btn btn-ghost" onClick={() => handleSave(false)} disabled={saving}>Save Draft</button>
          <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>Publish</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 260, borderRight: '1px solid var(--line)', background: 'var(--ink-900)', overflowY: 'auto' }}>
          <div style={{ padding: 18, borderBottom: '1px solid var(--line)' }}>
            <div className="label">Add step</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <button className="btn btn-sm" onClick={() => addStep('http')}>+ HTTP Call</button>
              <button className="btn btn-sm" onClick={() => addStep('transform')}>+ Transform</button>
              <button className="btn btn-sm" onClick={() => addStep('parallel')}>+ Parallel Group</button>
            </div>
          </div>
          <SettingsPanel definition={definition} onChange={setDefinition} />
        </div>

        <div style={{ flex: 1, position: 'relative' }} className={viewMode === 'canvas' ? 'dotted-grid' : ''}>
          {viewMode === 'canvas' ? (
            <ReactFlowProvider>
              <ReactFlow nodes={nodes} edges={edges} nodeTypes={NODE_TYPES} fitView proOptions={{ hideAttribution: true }}>
                <Background color="transparent" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </ReactFlowProvider>
          ) : (
            <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <textarea className="textarea" style={{ flex: 1 }} value={rawJson} onChange={(e) => setRawJson(e.target.value)} />
              {rawJsonError && <div style={{ color: 'var(--rose)', fontSize: 12.5, marginTop: 8 }}>{rawJsonError}</div>}
              <button className="btn btn-primary" style={{ marginTop: 10, alignSelf: 'flex-start' }} onClick={applyRawJson}>Apply JSON</button>
            </div>
          )}
        </div>

        {selectedStep && (
          <div style={{ width: 340, borderLeft: '1px solid var(--line)', background: 'var(--ink-900)' }}>
            <StepInspector step={selectedStep} plugins={plugins} onChange={handleStepChange} onDelete={deleteSelected} onClose={() => setSelected(null)} />
          </div>
        )}
        {selected?.kind === 'response' && (
          <div style={{ width: 340, borderLeft: '1px solid var(--line)', background: 'var(--ink-900)', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="label" style={{ margin: 0 }}>Response mapping</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <textarea
              className="textarea"
              rows={14}
              defaultValue={JSON.stringify(definition.response || {}, null, 2)}
              onBlur={(e) => {
                try {
                  setDefinition({ ...definition, response: JSON.parse(e.target.value) });
                } catch {
                  flashToast('Invalid JSON in response mapping');
                }
              }}
            />
          </div>
        )}
      </div>

      {showTestModal && <TestRunModal definition={definition} onClose={() => setShowTestModal(false)} onTraceUpdate={setTrace} />}
    </div>
  );
}
