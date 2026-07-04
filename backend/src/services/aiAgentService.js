const axios = require('axios');
const env = require('../config/env');
const logger = require('../config/logger');

const SYSTEM_PROMPT = `You are an assistant embedded in an API orchestration platform.
Your only job is to convert a plain-English description of an integration into a
workflow configuration JSON object that this engine understands.

The JSON schema you must follow:
{
  "slug": "kebab-case-endpoint-name",
  "method": "POST" | "GET",
  "description": "short description",
  "auth": { "type": "apiKey" | "none" },
  "inputSchema": {
    "body": { "<field>": { "type": "string|number|boolean", "required": true|false, "pattern": "optional regex" } }
  },
  "steps": [
    {
      "id": "camelCaseStepId",
      "type": "http",
      "request": { "method": "POST", "url": "http://localhost:4000/mock/<vendor>/<action>", "headers": {}, "body": { "field": "{{input.body.field}}" } },
      "retry": { "maxAttempts": 3, "backoffMs": 300 },
      "condition": { "path": "steps.otherStepId.response.data.field", "operator": "isTrue" }
    },
    {
      "id": "anotherStep",
      "type": "transform",
      "plugin": "formatters" | "aggregators",
      "fn": "<function name>",
      "input": "{{steps.someStep.response.data.field}}"
    }
  ],
  "response": { "<outputField>": "{{steps.someStep.response.data.field}}" }
}

Available mock vendors the generated workflow may call:
- POST http://localhost:4000/mock/pan/verify           body: { pan_number }
- POST http://localhost:4000/mock/aadhaar/validate      body: { aadhaar_number }
- GET  http://localhost:4000/mock/gst/lookup            query: { pan }
- POST http://localhost:4000/mock/document/ocr/extract  body: { image_base64 }
- POST http://localhost:4000/mock/document/fraud/check  body: { document_id }
- POST http://localhost:4000/mock/document/face/match   body: { selfie_base64, document_id }

Available plugin functions:
- formatters: maskAadhaar, maskPan, toTitleCase, calculateAge, pickFields
- aggregators: averageScore, decideByThreshold, mergeObjects

Respond with ONLY the JSON object. No markdown fences, no commentary.`;

// async function callClaude(userPrompt) {
//   const response = await axios.post(
//     'https://api.anthropic.com/v1/messages',
//     {
//       model: env.aiModel,
//       max_tokens: 2000,
//       system: SYSTEM_PROMPT,
//       messages: [{ role: 'user', content: userPrompt }],
//     },
//     {
//       headers: {
//         'content-type': 'application/json',
//         'x-api-key': env.anthropicApiKey,
//         'anthropic-version': '2023-06-01',
//       },
//       timeout: 20000,
//     }
//   );
//   const textBlock = response.data.content.find((b) => b.type === 'text');
//   return JSON.parse(textBlock.text);
// }


async function callClaude(userPrompt) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: env.aiModel,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      timeout: 20000,
    }
  );
  const text = response.data.choices[0].message.content;
  return JSON.parse(text.replace(/^```json\n?|\n?```$/g, ''));
}

// If no API key is configured, fall back to a rule-based generator so the
// AI Assistant tab still works out of the box for anyone reviewing the
// project without setting up credentials. It recognises the same kind of
// phrasing used in the assignment brief itself.
function ruleBasedGenerate(description) {
  const text = description.toLowerCase();

  const wantsPan = /\bpan\b/.test(text);
  const wantsAadhaar = /aadhaar/.test(text);
  const wantsGst = /\bgst\b/.test(text);
  const wantsDocument = /document|ocr|fraud|face/.test(text);

  if (wantsDocument) {
    return require('../../sample-configs/document-verification.json');
  }
  if (wantsPan && wantsGst) {
    return require('../../sample-configs/verify-pan-then-gst.json');
  }
  if (wantsAadhaar) {
    return require('../../sample-configs/verify-aadhaar.json');
  }
  if (wantsPan) {
    return require('../../sample-configs/verify-pan.json');
  }

  // Generic single-vendor skeleton as a last resort.
  return {
    slug: 'generated-endpoint',
    method: 'POST',
    description: description.slice(0, 140),
    auth: { type: 'none' },
    inputSchema: { body: { input: { type: 'string', required: true } } },
    steps: [
      {
        id: 'callVendor',
        type: 'http',
        request: { method: 'POST', url: 'http://localhost:4000/mock/pan/verify', body: { pan_number: '{{input.body.input}}' } },
        retry: { maxAttempts: 2, backoffMs: 300 },
      },
    ],
    response: { result: '{{steps.callVendor.response.data}}' },
  };
}

async function generateWorkflowFromDescription(description) {
  if (!env.groqApiKey) {
    logger.info('AI agent running in rule-based fallback mode (no ANTHROPIC_API_KEY set)');
    return { source: 'rule-based-fallback', definition: ruleBasedGenerate(description) };
  }
  try {
    const definition = await callClaude(description);
    return { source: 'llm', definition };
  } catch (err) {
    logger.warn(`AI agent LLM call failed, falling back to rule-based generator: ${err.message}`);
    return { source: 'rule-based-fallback', definition: ruleBasedGenerate(description) };
  }
}

// Static analysis over a workflow definition - catches the mistakes that
// are easy to make when hand-writing orchestration JSON.
function lintWorkflow(definition) {
  const issues = [];
  const stepIds = new Set();

  if (!definition.slug) issues.push({ level: 'error', message: 'Missing "slug"' });
  if (!definition.method) issues.push({ level: 'error', message: 'Missing "method"' });
  if (!Array.isArray(definition.steps) || definition.steps.length === 0) {
    issues.push({ level: 'error', message: 'Workflow must declare at least one step' });
  }

  (definition.steps || []).forEach((step, index) => {
    if (!step.id) {
      issues.push({ level: 'error', message: `Step at index ${index} is missing "id"` });
      return;
    }
    if (stepIds.has(step.id)) {
      issues.push({ level: 'error', message: `Duplicate step id "${step.id}"` });
    }
    stepIds.add(step.id);

    if (!['http', 'transform', 'parallel'].includes(step.type)) {
      issues.push({ level: 'error', message: `Step "${step.id}" has unknown type "${step.type}"` });
    }
    if (step.type === 'http' && !step.request?.url) {
      issues.push({ level: 'error', message: `Step "${step.id}" is type http but has no request.url` });
    }
    if (step.type === 'transform' && (!step.plugin || !step.fn)) {
      issues.push({ level: 'error', message: `Step "${step.id}" is type transform but missing plugin/fn` });
    }

    // Referenced step ids inside templates must exist and must come *before* this step.
    const raw = JSON.stringify(step);
    const refs = [...raw.matchAll(/steps\.([a-zA-Z0-9_]+)/g)].map((m) => m[1]);
    refs.forEach((ref) => {
      if (!stepIds.has(ref) && ref !== step.id) {
        issues.push({ level: 'warning', message: `Step "${step.id}" references "steps.${ref}" which is not defined before it` });
      }
    });
  });

  if (!definition.response) {
    issues.push({ level: 'warning', message: 'No "response" mapping defined - the API will return a generic success object' });
  }

  return { valid: !issues.some((i) => i.level === 'error'), issues };
}

// Generates a handful of request bodies (valid + boundary + invalid) straight
// from a workflow's declared inputSchema, so a reviewer can hit "Test" without
// hand-writing payloads.
function generateTestCases(definition) {
  const bodySchema = definition.inputSchema?.body || {};
  const validCase = {};
  const invalidCase = {};

  for (const [field, rule] of Object.entries(bodySchema)) {
    validCase[field] = sampleValueFor(field, rule, true);
    invalidCase[field] = rule.required ? sampleValueFor(field, rule, false) : validCase[field];
  }

  return [
    { name: 'Valid request', expected: '2xx', payload: validCase },
    { name: 'Invalid / missing required fields', expected: '400', payload: invalidCase },
  ];
}

function sampleValueFor(field, rule, valid) {
  if (!valid && rule.required) return undefined;
  if (rule.enum) return rule.enum[0];
  if (rule.pattern) {
    if (/pan/i.test(field)) return 'ABCDE1234F';
    if (/aadhaar/i.test(field)) return '234567890123';
  }
  switch (rule.type) {
    case 'number':
      return rule.min ?? 1;
    case 'boolean':
      return true;
    default:
      return `sample_${field}`;
  }
}

module.exports = { generateWorkflowFromDescription, lintWorkflow, generateTestCases };
