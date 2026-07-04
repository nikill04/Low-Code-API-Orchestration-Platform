const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');

const requestLogger = require('./middleware/requestLogger');
const { globalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const aiRoutes = require('./routes/aiRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const dynamicRouter = require('./services/dynamicRouter');

const panVendor = require('./mockVendors/panVendor');
const aadhaarVendor = require('./mockVendors/aadhaarVendor');
const gstVendor = require('./mockVendors/gstVendor');
const documentVendors = require('./mockVendors/documentVendors');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(requestLogger);
app.use(globalLimiter);

// --- API documentation -----------------------------------------------------
const openapiDocument = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

// --- Health check ------------------------------------------------------------
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- Mock third-party vendors (stand-ins for real bank/KYC/payment APIs) ----
app.use('/mock/pan', panVendor);
app.use('/mock/aadhaar', aadhaarVendor);
app.use('/mock/gst', gstVendor);
app.use('/mock/document', documentVendors);

// --- Management API (v1) -----------------------------------------------------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/metrics', metricsRoutes);

// --- Generated / config-driven business endpoints ----------------------------
// Every API a user defines through the platform is served from here.
app.use('/api/v1', dynamicRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
