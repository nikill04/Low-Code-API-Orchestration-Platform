const axios = require('axios');
const logger = require('../config/logger');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls a downstream API with configurable retry + exponential backoff.
 *
 * retryConfig example:
 *   { maxAttempts: 3, backoffMs: 300, retryOn: [429, 500, 502, 503, 504] }
 */
async function callWithRetry({ method, url, headers, params, data, timeoutMs = 5000, retryConfig = {} }) {
  const maxAttempts = retryConfig.maxAttempts ?? 1;
  const backoffMs = retryConfig.backoffMs ?? 250;
  const retryOn = retryConfig.retryOn ?? [408, 429, 500, 502, 503, 504];

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios({
        method,
        url,
        headers,
        params,
        data,
        timeout: timeoutMs,
        validateStatus: () => true, // we decide what's an error ourselves
      });

      const isRetryableStatus = retryOn.includes(response.status);
      if (isRetryableStatus && attempt < maxAttempts) {
        logger.warn(`Vendor call to ${url} returned ${response.status}, retrying (${attempt}/${maxAttempts})`);
        await sleep(backoffMs * attempt);
        continue;
      }

      return {
        status: response.status,
        headers: response.headers,
        data: response.data,
        attempts: attempt,
      };
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        logger.warn(`Vendor call to ${url} threw "${err.message}", retrying (${attempt}/${maxAttempts})`);
        await sleep(backoffMs * attempt);
        continue;
      }
    }
  }

  const error = new Error(`Downstream call to ${url} failed after ${maxAttempts} attempt(s): ${lastError?.message}`);
  error.cause = lastError;
  throw error;
}

module.exports = { callWithRetry };
