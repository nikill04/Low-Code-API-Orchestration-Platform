const { evaluateCondition } = require('../src/engine/conditionEvaluator');

const context = {
  steps: {
    verifyPan: { response: { status: 200, data: { valid: true, score: 0.9 } } },
  },
};

describe('conditionEvaluator', () => {
  test('equals operator', () => {
    expect(evaluateCondition({ path: 'steps.verifyPan.response.status', operator: 'equals', value: 200 }, context)).toBe(true);
  });

  test('isTrue operator', () => {
    expect(evaluateCondition({ path: 'steps.verifyPan.response.data.valid', operator: 'isTrue' }, context)).toBe(true);
  });

  test('gte operator', () => {
    expect(evaluateCondition({ path: 'steps.verifyPan.response.data.score', operator: 'gte', value: 0.5 }, context)).toBe(true);
  });

  test('missing condition defaults to true (step always runs)', () => {
    expect(evaluateCondition(undefined, context)).toBe(true);
  });

  test('all() combinator requires every sub-condition to pass', () => {
    const condition = {
      all: [
        { path: 'steps.verifyPan.response.status', operator: 'equals', value: 200 },
        { path: 'steps.verifyPan.response.data.valid', operator: 'isTrue' },
      ],
    };
    expect(evaluateCondition(condition, context)).toBe(true);
  });

  test('any() combinator passes if one sub-condition passes', () => {
    const condition = {
      any: [
        { path: 'steps.verifyPan.response.status', operator: 'equals', value: 999 },
        { path: 'steps.verifyPan.response.data.valid', operator: 'isTrue' },
      ],
    };
    expect(evaluateCondition(condition, context)).toBe(true);
  });

  test('throws on an unknown operator instead of failing silently', () => {
    expect(() => evaluateCondition({ path: 'steps.verifyPan.response.status', operator: 'blah' }, context)).toThrow();
  });
});
