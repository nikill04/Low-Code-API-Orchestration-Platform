const NodeCache = require('node-cache');

// Single shared cache instance for the whole process. Steps can opt in to
// caching by adding a `cache: { ttlSeconds, key }` block to their config -
// useful for vendor lookups that are expensive but don't change often
// (e.g. a pin-code -> city lookup).
const cache = new NodeCache({ checkperiod: 60 });

function buildCacheKey(prefix, resolvedKeyParts) {
  return `${prefix}:${JSON.stringify(resolvedKeyParts)}`;
}

module.exports = { cache, buildCacheKey };
