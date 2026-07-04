const Joi = require('joi');

/**
 * Workflow configs declare their expected input like:
 * {
 *   "body": {
 *     "pan": { "type": "string", "required": true, "pattern": "^[A-Z]{5}[0-9]{4}[A-Z]$" },
 *     "consent": { "type": "boolean", "required": true }
 *   },
 *   "query": {
 *     "verbose": { "type": "boolean", "required": false }
 *   }
 * }
 *
 * This builds the equivalent Joi schema on demand rather than forcing the
 * workflow author to write raw Joi - keeps the config JSON-serialisable so
 * it can be produced by the UI or the AI agent.
 */
function fieldToJoi(fieldDef) {
  let schema;
  switch (fieldDef.type) {
    case 'string':
      schema = Joi.string();
      if (fieldDef.pattern) schema = schema.pattern(new RegExp(fieldDef.pattern));
      if (fieldDef.minLength) schema = schema.min(fieldDef.minLength);
      if (fieldDef.maxLength) schema = schema.max(fieldDef.maxLength);
      if (fieldDef.enum) schema = schema.valid(...fieldDef.enum);
      break;
    case 'number':
      schema = Joi.number();
      if (fieldDef.min !== undefined) schema = schema.min(fieldDef.min);
      if (fieldDef.max !== undefined) schema = schema.max(fieldDef.max);
      break;
    case 'boolean':
      schema = Joi.boolean();
      break;
    case 'object':
      schema = Joi.object().unknown(true);
      break;
    case 'array':
      schema = Joi.array();
      break;
    default:
      schema = Joi.any();
  }
  return fieldDef.required ? schema.required() : schema.optional();
}

function buildSectionSchema(sectionDef = {}) {
  const shape = {};
  for (const [key, fieldDef] of Object.entries(sectionDef)) {
    shape[key] = fieldToJoi(fieldDef);
  }
  return Joi.object(shape).unknown(true);
}

function validateAgainstSchema(inputSchema, { body, query, params }) {
  const errors = [];

  if (inputSchema?.body) {
    const { error } = buildSectionSchema(inputSchema.body).validate(body || {}, { abortEarly: false });
    if (error) errors.push(...error.details.map((d) => `body.${d.path.join('.')}: ${d.message}`));
  }
  if (inputSchema?.query) {
    const { error } = buildSectionSchema(inputSchema.query).validate(query || {}, { abortEarly: false });
    if (error) errors.push(...error.details.map((d) => `query.${d.path.join('.')}: ${d.message}`));
  }
  if (inputSchema?.params) {
    const { error } = buildSectionSchema(inputSchema.params).validate(params || {}, { abortEarly: false });
    if (error) errors.push(...error.details.map((d) => `params.${d.path.join('.')}: ${d.message}`));
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateAgainstSchema };
