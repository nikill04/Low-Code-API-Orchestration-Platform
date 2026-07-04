import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }),
  listApiKeys: () => client.get('/auth/api-keys'),
  createApiKey: (label) => client.post('/auth/api-keys', { label }),
  revokeApiKey: (id) => client.delete(`/auth/api-keys/${id}`),
};

export const workflowApi = {
  list: () => client.get('/workflows'),
  get: (id) => client.get(`/workflows/${id}`),
  create: (definition, activate = true) => client.post('/workflows', { definition, activate }),
  addVersion: (id, definition, activate = true) => client.post(`/workflows/${id}/versions`, { definition, activate }),
  activateVersion: (id, version) => client.post(`/workflows/${id}/versions/${version}/activate`),
  remove: (id) => client.delete(`/workflows/${id}`),
  testRun: (definition, input) => client.post('/workflows/test-run', { definition, input }),
  logs: (id) => client.get(`/workflows/${id}/logs`),
  plugins: () => client.get('/workflows/plugins'),
};

export const aiApi = {
  generate: (description) => client.post('/ai/generate', { description }),
  lint: (definition) => client.post('/ai/lint', { definition }),
  testCases: (definition) => client.post('/ai/test-cases', { definition }),
};

export const metricsApi = {
  get: () => client.get('/metrics'),
};

export const runApi = {
  // Hits a *published* endpoint the same way an external client would -
  // used by the Test Console for a true end-to-end check.
  invoke: (method, slug, payload, headers = {}) => client({ method, url: `/run/${slug}`, data: payload, headers }),
};
