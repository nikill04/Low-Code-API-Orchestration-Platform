const { getByPath, setByPath, resolveMapping } = require('../src/engine/mapper');

describe('mapper.getByPath', () => {
  test('reads nested values', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(getByPath(obj, 'a.b.c')).toBe(42);
  });

  test('reads array indices', () => {
    const obj = { list: [{ name: 'first' }, { name: 'second' }] };
    expect(getByPath(obj, 'list[1].name')).toBe('second');
  });

  test('returns undefined for missing paths instead of throwing', () => {
    expect(getByPath({ a: 1 }, 'a.b.c')).toBeUndefined();
  });
});

describe('mapper.setByPath', () => {
  test('creates intermediate objects as needed', () => {
    const obj = {};
    setByPath(obj, 'a.b.c', 'hello');
    expect(obj).toEqual({ a: { b: { c: 'hello' } } });
  });
});

describe('mapper.resolveMapping', () => {
  const context = {
    input: { body: { pan: 'ABCDE1234F' } },
    steps: { verifyPan: { response: { data: { valid: true } } } },
  };

  test('resolves a single template to its raw type (not stringified)', () => {
    expect(resolveMapping('{{steps.verifyPan.response.data.valid}}', context)).toBe(true);
  });

  test('resolves an object of templates recursively', () => {
    const result = resolveMapping({ pan: '{{input.body.pan}}', ok: '{{steps.verifyPan.response.data.valid}}' }, context);
    expect(result).toEqual({ pan: 'ABCDE1234F', ok: true });
  });

  test('leaves plain strings untouched', () => {
    expect(resolveMapping('static-value', context)).toBe('static-value');
  });

  test('interpolates templates embedded inside a larger string', () => {
    expect(resolveMapping('PAN is {{input.body.pan}}', context)).toBe('PAN is ABCDE1234F');
  });
});
