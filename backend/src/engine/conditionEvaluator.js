const { getByPath, resolveTemplateString } = require('./mapper');

/**
 * Evaluates simple, safe conditions declared in workflow config, e.g.
 *   { "path": "steps.verifyPan.response.status", "operator": "equals", "value": 200 }
 *   { "path": "steps.verifyPan.response.data.valid", "operator": "isTrue" }
 *   { "path": "steps.ocr.response.data.confidence", "operator": "gte", "value": 0.8 }
 *
 * We deliberately avoid eval()/new Function() so workflow configs (which
 * may be user-authored) can never execute arbitrary code.
 */
const OPERATORS = {
  equals: (a, b) => a === b,
  notEquals: (a, b) => a !== b,
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  contains: (a, b) => typeof a === 'string' && a.includes(b),
  isTrue: (a) => a === true,
  isFalse: (a) => a === false,
  exists: (a) => a !== undefined && a !== null,
  notExists: (a) => a === undefined || a === null,
};

function evaluateCondition(condition, context) {
  if (!condition) return true;

  // Support combinators: { all: [cond, cond] } / { any: [cond, cond] }
  if (condition.all) return condition.all.every((c) => evaluateCondition(c, context));
  if (condition.any) return condition.any.some((c) => evaluateCondition(c, context));

  const { path, operator, value } = condition;
  const operatorFn = OPERATORS[operator];
  if (!operatorFn) {
    throw new Error(`Unsupported condition operator: ${operator}`);
  }

  const actual = getByPath(context, path);
  const expected = typeof value === 'string' ? resolveTemplateString(value, context) : value;
  return operatorFn(actual, expected);
}

module.exports = { evaluateCondition, OPERATORS };
