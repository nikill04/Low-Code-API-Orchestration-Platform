const { v4: uuid } = require('uuid');
const db = require('../db/db');

const MAX_LOGS_PER_WORKFLOW = 200; // simple retention so the demo db.json doesn't grow unbounded

function recordExecution({ workflowId, slug, version, requestId, success, durationMs, trace, input, response, error }) {
  const entry = {
    id: uuid(),
    workflowId,
    slug,
    version,
    requestId,
    success,
    durationMs,
    trace,
    input,
    response,
    error,
    startedAt: new Date().toISOString(),
  };
  db.get('executionLogs').push(entry).write();

  const logsForWorkflow = db.get('executionLogs').filter({ workflowId }).orderBy('startedAt', 'asc').value();
  if (logsForWorkflow.length > MAX_LOGS_PER_WORKFLOW) {
    const toRemoveIds = logsForWorkflow.slice(0, logsForWorkflow.length - MAX_LOGS_PER_WORKFLOW).map((l) => l.id);
    db.get('executionLogs')
      .remove((log) => toRemoveIds.includes(log.id))
      .write();
  }

  return entry;
}

function listLogs({ workflowId, limit = 50 } = {}) {
  let query = db.get('executionLogs');
  if (workflowId) query = query.filter({ workflowId });
  return query.orderBy('startedAt', 'desc').take(limit).value();
}

function getLog(id) {
  return db.get('executionLogs').find({ id }).value();
}

function getStats() {
  const logs = db.get('executionLogs').value();
  const total = logs.length;
  const successCount = logs.filter((l) => l.success).length;
  const avgDuration = total ? Math.round(logs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / total) : 0;

  const byWorkflow = {};
  for (const log of logs) {
    byWorkflow[log.slug] = byWorkflow[log.slug] || { total: 0, success: 0, failed: 0 };
    byWorkflow[log.slug].total += 1;
    byWorkflow[log.slug][log.success ? 'success' : 'failed'] += 1;
  }

  return { total, successCount, failureCount: total - successCount, avgDurationMs: avgDuration, byWorkflow };
}

module.exports = { recordExecution, listLogs, getLog, getStats };
