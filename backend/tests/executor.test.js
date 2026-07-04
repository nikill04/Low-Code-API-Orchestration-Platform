jest.mock('../src/engine/httpClient');
const { callWithRetry } = require('../src/engine/httpClient');
const { executeWorkflow } = require('../src/engine/executor');

describe('executor', () => {
  afterEach(() => jest.clearAllMocks());

  test('runs a simple single-step http workflow and maps the response', async () => {
    callWithRetry.mockResolvedValueOnce({ status: 200, data: { valid: true, name_on_record: 'Test User' } });

    const definition = {
      steps: [
        {
          id: 'verifyPan',
          type: 'http',
          request: { method: 'POST', url: 'http://vendor/verify', body: { pan_number: '{{input.body.pan}}' } },
        },
      ],
      response: { valid: '{{steps.verifyPan.response.data.valid}}', name: '{{steps.verifyPan.response.data.name_on_record}}' },
    };

    const result = await executeWorkflow({ definition, input: { body: { pan: 'ABCDE1234F' } } });

    expect(result.success).toBe(true);
    expect(result.response).toEqual({ valid: true, name: 'Test User' });
    expect(callWithRetry).toHaveBeenCalledWith(expect.objectContaining({ data: { pan_number: 'ABCDE1234F' } }));
  });

  test('skips a step whose condition fails and does not call the vendor', async () => {
    callWithRetry.mockResolvedValueOnce({ status: 200, data: { valid: false } });

    const definition = {
      steps: [
        { id: 'verifyPan', type: 'http', request: { method: 'POST', url: 'http://vendor/verify' } },
        {
          id: 'fetchGst',
          type: 'http',
          condition: { path: 'steps.verifyPan.response.data.valid', operator: 'isTrue' },
          request: { method: 'GET', url: 'http://vendor/gst' },
        },
      ],
      response: { gstStatus: '{{steps.fetchGst.status}}' },
    };

    const result = await executeWorkflow({ definition, input: { body: {} } });

    expect(callWithRetry).toHaveBeenCalledTimes(1);
    expect(result.response.gstStatus).toBe('skipped');
  });

  test('a failed step aborts the workflow unless onError is "continue"', async () => {
    callWithRetry.mockResolvedValueOnce({ status: 500, data: {} });

    const definition = {
      steps: [{ id: 'flaky', type: 'http', request: { method: 'GET', url: 'http://vendor/flaky' } }],
      response: { ok: true },
    };

    const result = await executeWorkflow({ definition, input: { body: {} } });
    expect(result.success).toBe(false);
    expect(result.error.stepId).toBe('flaky');
  });

  test('runs nested steps of a parallel block and exposes both results at top level', async () => {
    callWithRetry.mockResolvedValueOnce({ status: 200, data: { flagged: false } }).mockResolvedValueOnce({ status: 200, data: { match: true } });

    const definition = {
      steps: [
        {
          id: 'checks',
          type: 'parallel',
          steps: [
            { id: 'fraud', type: 'http', request: { method: 'POST', url: 'http://vendor/fraud' } },
            { id: 'face', type: 'http', request: { method: 'POST', url: 'http://vendor/face' } },
          ],
        },
      ],
      response: { flagged: '{{steps.fraud.response.data.flagged}}', match: '{{steps.face.response.data.match}}' },
    };

    const result = await executeWorkflow({ definition, input: { body: {} } });
    expect(result.success).toBe(true);
    expect(result.response).toEqual({ flagged: false, match: true });
  });
});
