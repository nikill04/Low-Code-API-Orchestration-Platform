const fs = require('fs');
const path = require('path');
const db = require('./db');
const authService = require('./../services/authService');
const workflowService = require('./../services/workflowService');
const logger = require('../config/logger');

authService.bootstrapDefaultAdmin();
const admin = db.get('users').find({}).value();

const sampleDir = path.join(__dirname, '..', '..', 'sample-configs');
const files = fs.readdirSync(sampleDir).filter((f) => f.endsWith('.json'));

let created = 0;
for (const file of files) {
  const definition = JSON.parse(fs.readFileSync(path.join(sampleDir, file), 'utf-8'));
  const exists = workflowService.getWorkflowBySlugAndMethod(definition.slug, definition.method);
  if (exists) {
    logger.info(`Skipping "${definition.slug}" - already seeded`);
    continue;
  }
  workflowService.createWorkflow({ slug: definition.slug, method: definition.method, definition, createdBy: admin.id, activate: true });
  created += 1;
  logger.info(`Seeded workflow "${definition.slug}" (${definition.method}) from ${file}`);
}

logger.info(`Seed complete. ${created} workflow(s) created.`);
