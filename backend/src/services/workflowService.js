const { v4: uuid } = require('uuid');
const db = require('../db/db');

/**
 * A "workflow" is the stable identity (slug + method). Every time it is
 * saved, a new immutable "workflowVersion" row is created and the
 * workflow's activeVersion pointer is updated (unless the caller asks to
 * save as a draft without activating it). This gives us workflow
 * versioning + safe rollback almost for free.
 */
function listWorkflows() {
  const workflows = db.get('workflows').value();
  return workflows.map((wf) => ({
    ...wf,
    versionCount: db.get('workflowVersions').filter({ workflowId: wf.id }).size().value(),
  }));
}

function getWorkflow(id) {
  return db.get('workflows').find({ id }).value();
}

function getWorkflowBySlugAndMethod(slug, method) {
  return db.get('workflows').find({ slug, method: method.toUpperCase() }).value();
}

function listVersions(workflowId) {
  return db.get('workflowVersions').filter({ workflowId }).orderBy('version', 'desc').value();
}

function getActiveDefinition(workflow) {
  const version = db
    .get('workflowVersions')
    .find({ workflowId: workflow.id, version: workflow.activeVersion })
    .value();
  return version?.definition;
}

function createWorkflow({ slug, method, definition, createdBy, activate = true }) {
  const existing = getWorkflowBySlugAndMethod(slug, method);
  if (existing) {
    throw Object.assign(new Error(`A workflow already exists for ${method.toUpperCase()} ${slug}`), { status: 409 });
  }

  const workflowId = uuid();
  const now = new Date().toISOString();

  db.get('workflows')
    .push({
      id: workflowId,
      slug,
      method: method.toUpperCase(),
      description: definition.description || '',
      activeVersion: activate ? 1 : null,
      createdAt: now,
      createdBy,
    })
    .write();

  db.get('workflowVersions')
    .push({ id: uuid(), workflowId, version: 1, definition, createdAt: now, createdBy })
    .write();

  return getWorkflow(workflowId);
}

function addVersion({ workflowId, definition, createdBy, activate = true }) {
  const workflow = getWorkflow(workflowId);
  if (!workflow) throw Object.assign(new Error('Workflow not found'), { status: 404 });

  const latest = db.get('workflowVersions').filter({ workflowId }).orderBy('version', 'desc').first().value();
  const nextVersion = (latest?.version || 0) + 1;
  const now = new Date().toISOString();

  db.get('workflowVersions')
    .push({ id: uuid(), workflowId, version: nextVersion, definition, createdAt: now, createdBy })
    .write();

  if (activate) {
    db.get('workflows').find({ id: workflowId }).assign({ activeVersion: nextVersion }).write();
  }

  return { workflow: getWorkflow(workflowId), version: nextVersion };
}

function activateVersion(workflowId, version) {
  const exists = db.get('workflowVersions').find({ workflowId, version }).value();
  if (!exists) throw Object.assign(new Error('Version not found'), { status: 404 });
  db.get('workflows').find({ id: workflowId }).assign({ activeVersion: version }).write();
  return getWorkflow(workflowId);
}

function deleteWorkflow(workflowId) {
  db.get('workflows').remove({ id: workflowId }).write();
  db.get('workflowVersions').remove({ workflowId }).write();
  db.get('executionLogs').remove({ workflowId }).write();
  db.get('scheduledJobs').remove({ workflowId }).write();
  db.get('webhookSubscriptions').remove({ workflowId }).write();
}

module.exports = {
  listWorkflows,
  getWorkflow,
  getWorkflowBySlugAndMethod,
  listVersions,
  getActiveDefinition,
  createWorkflow,
  addVersion,
  activateVersion,
  deleteWorkflow,
};
