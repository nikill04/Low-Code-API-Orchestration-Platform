const V_SPACING = 128;

// We deliberately keep the layout dead simple - a straight vertical chain
// from Trigger to Response. Parallel steps render as one wider node that
// lists its children as chips rather than as a nested sub-graph; for the
// kinds of orchestration flows this platform targets (a handful of steps,
// occasionally branching into 2-3 parallel calls) that reads far more
// clearly than a force-directed graph would, and it means the layout never
// needs a real auto-layout algorithm.
export function definitionToGraph(definition) {
  const nodes = [];
  const edges = [];
  const steps = definition.steps || [];

  nodes.push({
    id: '__trigger__',
    type: 'triggerNode',
    position: { x: 0, y: 0 },
    data: { method: definition.method, slug: definition.slug },
    draggable: false,
  });

  let prevId = '__trigger__';
  steps.forEach((step, index) => {
    const nodeId = step.id || `step-${index}`;
    nodes.push({
      id: nodeId,
      type: 'stepNode',
      position: { x: 0, y: (index + 1) * V_SPACING },
      data: { step, index },
      draggable: false,
    });
    edges.push({ id: `${prevId}->${nodeId}`, source: prevId, target: nodeId, animated: false });
    prevId = nodeId;
  });

  nodes.push({
    id: '__response__',
    type: 'responseNode',
    position: { x: 0, y: (steps.length + 1) * V_SPACING },
    data: { response: definition.response },
    draggable: false,
  });
  edges.push({ id: `${prevId}->__response__`, source: prevId, target: '__response__' });

  return { nodes, edges };
}

export function summarizeStep(step) {
  if (step.type === 'http') {
    return `${step.request?.method || 'GET'} ${step.request?.url || ''}`;
  }
  if (step.type === 'transform') {
    return `${step.plugin || '?'}.${step.fn || '?'}()`;
  }
  if (step.type === 'parallel') {
    return `${step.steps?.length || 0} steps in parallel`;
  }
  return '';
}
