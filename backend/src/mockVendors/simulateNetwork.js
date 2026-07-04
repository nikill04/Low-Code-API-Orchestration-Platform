const env = require('../config/env');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Every mock vendor route calls this first so the platform has something
// real to demonstrate retries, timeouts and error handling against,
// instead of always returning a clean 200 instantly.
function simulateNetwork() {
  return new Promise((resolve, reject) => {
    const latency = randomInt(env.mockVendorMinLatencyMs, env.mockVendorMaxLatencyMs);
    setTimeout(() => {
      if (Math.random() < env.mockVendorFailureRate) {
        reject(Object.assign(new Error('Simulated vendor outage'), { status: 503 }));
      } else {
        resolve();
      }
    }, latency);
  });
}

module.exports = { simulateNetwork, randomInt };
