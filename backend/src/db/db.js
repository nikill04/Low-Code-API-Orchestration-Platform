const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

// We use a small file-backed JSON store instead of a full database server.
// The assignment explicitly allows "JSON/YAML/Database" as the config
// source - for a self-contained weekend project a file DB keeps setup to
// "npm install && npm start" while still giving us real persistence,
// querying and atomic writes via lowdb.
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbFile = path.join(dataDir, 'db.json');
const adapter = new FileSync(dbFile);
const db = low(adapter);

db.defaults({
  users: [],
  apiKeys: [],
  workflows: [], // { id, slug, method, activeVersion, createdAt, ownerId }
  workflowVersions: [], // { id, workflowId, version, definition, createdAt, createdBy }
  executionLogs: [], // { id, workflowId, version, requestId, status, steps[], startedAt, durationMs }
  webhookSubscriptions: [], // { id, workflowId, url, event }
  scheduledJobs: [], // { id, workflowId, cronExpression, payload, enabled }
}).write();

module.exports = db;
