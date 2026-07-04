const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const authService = require('./services/authService');
const schedulerService = require('./services/schedulerService');
const { loadPlugins } = require('./engine/pluginLoader');

authService.bootstrapDefaultAdmin();
loadPlugins();
schedulerService.bootstrapScheduler();

app.listen(env.port, () => {
  logger.info(`API Orchestration Platform listening on port ${env.port}`);
  logger.info(`Swagger docs:      http://localhost:${env.port}/api-docs`);
  logger.info(`Default admin:     ${env.defaultAdminEmail} / ${env.defaultAdminPassword}`);
});
