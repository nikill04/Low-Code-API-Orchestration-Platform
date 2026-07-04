const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

/**
 * Plugin architecture for custom transform functions.
 *
 * Anything dropped into src/plugins/*.js that exports an object of
 * named functions `(input, args) => output` becomes callable from a
 * workflow config as { "type": "transform", "plugin": "formatters", "fn": "maskPan" }.
 *
 * This is intentionally tiny - the point is that adding a new data
 * transformation never requires touching the engine or route code,
 * only dropping a new file in src/plugins.
 */
const registry = new Map();

function loadPlugins() {
  const pluginsDir = path.join(__dirname, '..', 'plugins');
  const files = fs.readdirSync(pluginsDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const pluginName = path.basename(file, '.js');
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const mod = require(path.join(pluginsDir, file));
    registry.set(pluginName, mod);
    logger.debug(`Loaded plugin "${pluginName}" with functions: ${Object.keys(mod).join(', ')}`);
  }
  return registry;
}

function getPluginFn(pluginName, fnName) {
  if (!registry.size) loadPlugins();
  const plugin = registry.get(pluginName);
  if (!plugin) throw new Error(`Unknown plugin: ${pluginName}`);
  const fn = plugin[fnName];
  if (typeof fn !== 'function') throw new Error(`Plugin "${pluginName}" has no function "${fnName}"`);
  return fn;
}

function listPlugins() {
  if (!registry.size) loadPlugins();
  const result = {};
  for (const [name, mod] of registry.entries()) {
    result[name] = Object.keys(mod);
  }
  return result;
}

module.exports = { loadPlugins, getPluginFn, listPlugins };
