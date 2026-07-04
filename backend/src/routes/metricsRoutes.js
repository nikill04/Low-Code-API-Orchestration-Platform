const express = require('express');
const executionLogService = require('../services/executionLogService');
const workflowService = require('../services/workflowService');

const router = express.Router();
const processStartedAt = Date.now();

router.get('/', (req, res) => {
  const stats = executionLogService.getStats();
  res.json({
    success: true,
    data: {
      ...stats,
      uptimeSeconds: Math.round((Date.now() - processStartedAt) / 1000),
      publishedWorkflows: workflowService.listWorkflows().filter((w) => w.activeVersion != null).length,
      memory: process.memoryUsage(),
    },
  });
});

// Prometheus text-exposition format, so this can be scraped directly if
// someone wants to point Grafana/Prometheus at the platform.
router.get('/prometheus', (req, res) => {
  const stats = executionLogService.getStats();
  const lines = [
    '# HELP orchestrator_executions_total Total workflow executions',
    '# TYPE orchestrator_executions_total counter',
    `orchestrator_executions_total ${stats.total}`,
    '# HELP orchestrator_executions_success_total Successful workflow executions',
    '# TYPE orchestrator_executions_success_total counter',
    `orchestrator_executions_success_total ${stats.successCount}`,
    '# HELP orchestrator_executions_failure_total Failed workflow executions',
    '# TYPE orchestrator_executions_failure_total counter',
    `orchestrator_executions_failure_total ${stats.failureCount}`,
    '# HELP orchestrator_execution_avg_duration_ms Average execution duration in ms',
    '# TYPE orchestrator_execution_avg_duration_ms gauge',
    `orchestrator_execution_avg_duration_ms ${stats.avgDurationMs}`,
    '# HELP orchestrator_uptime_seconds Process uptime in seconds',
    '# TYPE orchestrator_uptime_seconds gauge',
    `orchestrator_uptime_seconds ${Math.round((Date.now() - processStartedAt) / 1000)}`,
  ];
  res.set('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});

module.exports = router;
