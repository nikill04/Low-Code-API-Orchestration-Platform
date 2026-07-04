const { v4: uuid } = require('uuid');
const db = require('../db/db');
const { callWithRetry } = require('../engine/httpClient');
const logger = require('../config/logger');

function subscribe({ workflowId, url, event = 'execution.completed' }) {
  const subscription = { id: uuid(), workflowId, url, event, createdAt: new Date().toISOString() };
  db.get('webhookSubscriptions').push(subscription).write();
  return subscription;
}

function unsubscribe(id) {
  db.get('webhookSubscriptions').remove({ id }).write();
}

function listSubscriptions(workflowId) {
  return db.get('webhookSubscriptions').filter({ workflowId }).value();
}

// Fire-and-forget with retry - a slow/broken subscriber should never block
// the caller who is waiting on the actual API response.
async function notify(workflowId, payload) {
  const subs = listSubscriptions(workflowId);
  for (const sub of subs) {
    callWithRetry({
      method: 'POST',
      url: sub.url,
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': sub.event },
      data: payload,
      timeoutMs: 4000,
      retryConfig: { maxAttempts: 3, backoffMs: 500 },
    }).catch((err) => {
      logger.warn(`Webhook delivery to ${sub.url} failed after retries: ${err.message}`);
    });
  }
}

module.exports = { subscribe, unsubscribe, listSubscriptions, notify };
