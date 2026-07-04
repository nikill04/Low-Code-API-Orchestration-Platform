require('dotenv').config();

// Centralised place to read process.env so the rest of the app never
// touches process.env directly. Makes it obvious what config the app
// actually depends on.
module.exports = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@orchestrator.dev',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 120,

  mockVendorFailureRate: parseFloat(process.env.MOCK_VENDOR_FAILURE_RATE ?? '0.15'),
  mockVendorMinLatencyMs: parseInt(process.env.MOCK_VENDOR_MIN_LATENCY_MS, 10) || 150,
  mockVendorMaxLatencyMs: parseInt(process.env.MOCK_VENDOR_MAX_LATENCY_MS, 10) || 600,

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'claude-sonnet-4-6',
};
