const cron = require('node-cron');
const { v4: uuid } = require('uuid');
const db = require('../db/db');
const workflowService = require('./workflowService');
const executionLogService = require('./executionLogService');
const { executeWorkflow } = require('../engine/executor');
const logger = require('../config/logger');

const activeTasks = new Map(); // scheduledJobId -> cron task handle

function runScheduledWorkflow(job) {
  return async () => {
    const workflow = workflowService.getWorkflow(job.workflowId);
    if (!workflow || workflow.activeVersion == null) {
      logger.warn(`Scheduled job ${job.id} skipped: workflow ${job.workflowId} has no active version`);
      return;
    }
    const definition = workflowService.getActiveDefinition(workflow);
    const input = { body: job.payload || {}, query: {}, params: {}, headers: { 'x-triggered-by': 'scheduler' } };

    logger.info(`Running scheduled job ${job.id} for workflow ${workflow.slug}`);
    const result = await executeWorkflow({ definition, input });

    executionLogService.recordExecution({
      workflowId: workflow.id,
      slug: workflow.slug,
      version: workflow.activeVersion,
      requestId: result.requestId,
      success: result.success,
      durationMs: result.durationMs,
      trace: result.trace,
      input,
      response: result.response,
      error: result.error,
    });
  };
}

function scheduleJob({ workflowId, cronExpression, payload, enabled = true }) {
  if (!cron.validate(cronExpression)) {
    throw Object.assign(new Error(`Invalid cron expression: ${cronExpression}`), { status: 400 });
  }
  const job = { id: uuid(), workflowId, cronExpression, payload, enabled, createdAt: new Date().toISOString() };
  db.get('scheduledJobs').push(job).write();
  if (enabled) startJob(job);
  return job;
}

function startJob(job) {
  const task = cron.schedule(job.cronExpression, runScheduledWorkflow(job));
  activeTasks.set(job.id, task);
}

function stopJob(jobId) {
  const task = activeTasks.get(jobId);
  if (task) {
    task.stop();
    activeTasks.delete(jobId);
  }
}

function deleteJob(jobId) {
  stopJob(jobId);
  db.get('scheduledJobs').remove({ id: jobId }).write();
}

function listJobs(workflowId) {
  const jobs = db.get('scheduledJobs').value();
  return workflowId ? jobs.filter((j) => j.workflowId === workflowId) : jobs;
}

// Called once on server boot to re-arm any jobs that were enabled before restart.
function bootstrapScheduler() {
  const jobs = db.get('scheduledJobs').filter({ enabled: true }).value();
  jobs.forEach(startJob);
  logger.info(`Scheduler bootstrapped with ${jobs.length} active job(s)`);
}

module.exports = { scheduleJob, stopJob, deleteJob, listJobs, bootstrapScheduler };
