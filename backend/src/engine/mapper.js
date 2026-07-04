/**
 * Field mapping engine.
 *
 * Workflow configs reference values using a small templating syntax, e.g.
 *   "{{input.body.pan}}"
 *   "{{steps.verifyPan.response.data.name}}"
 *   "static-value"                <- non-template strings pass through as-is
 *
 * getByPath() walks a dotted path (with array index support: a.b[0].c)
 * against a plain object. resolveValue() understands the {{ }} wrapper and
 * also supports whole-object mapping specs (an object of key -> template).
 */

function getByPath(obj, pathStr) {
  if (obj === undefined || obj === null) return undefined;
  const tokens = pathStr
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  let current = obj;
  for (const token of tokens) {
    if (current === undefined || current === null) return undefined;
    current = current[token];
  }
  return current;
}

function setByPath(obj, pathStr, value) {
  const tokens = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let current = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    if (current[token] === undefined || current[token] === null || typeof current[token] !== 'object') {
      // Look ahead: if the next token is numeric, build an array, else an object
      current[token] = /^\d+$/.test(tokens[i + 1]) ? [] : {};
    }
    current = current[token];
  }
  current[tokens[tokens.length - 1]] = value;
  return obj;
}

const TEMPLATE_RE = /^\{\{\s*([\w.[\]]+)\s*\}\}$/;
const INLINE_TEMPLATE_RE = /\{\{\s*([\w.[\]]+)\s*\}\}/g;

function resolveTemplateString(template, context) {
  const fullMatch = template.match(TEMPLATE_RE);
  if (fullMatch) {
    // Whole string is a single template -> preserve original type (number, object, array...)
    return getByPath(context, fullMatch[1]);
  }
  // Otherwise treat as a string with embedded templates, e.g. "Hello {{input.name}}!"
  if (INLINE_TEMPLATE_RE.test(template)) {
    INLINE_TEMPLATE_RE.lastIndex = 0;
    return template.replace(INLINE_TEMPLATE_RE, (_, path) => {
      const val = getByPath(context, path);
      return val === undefined || val === null ? '' : String(val);
    });
  }
  return template;
}

/**
 * Recursively resolve a mapping spec (string | object | array) against a context.
 * This lets a workflow config describe an entire vendor request body declaratively:
 *
 * {
 *   "pan_number": "{{input.body.pan}}",
 *   "consent": true,
 *   "meta": { "source": "orchestrator" }
 * }
 */
function resolveMapping(spec, context) {
  if (typeof spec === 'string') {
    return resolveTemplateString(spec, context);
  }
  if (Array.isArray(spec)) {
    return spec.map((item) => resolveMapping(item, context));
  }
  if (spec && typeof spec === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(spec)) {
      result[key] = resolveMapping(value, context);
    }
    return result;
  }
  return spec;
}

module.exports = { getByPath, setByPath, resolveMapping, resolveTemplateString };
