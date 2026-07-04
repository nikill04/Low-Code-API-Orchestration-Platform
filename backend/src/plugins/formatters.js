// Built-in plugin. Each exported function has the signature (input, args) => output
// `input` is whatever the workflow config points the transform step at,
// `args` is a plain object of extra parameters declared in the config.

function maskAadhaar(input) {
  if (typeof input !== 'string') return input;
  const digits = input.replace(/\s/g, '');
  if (digits.length !== 12) return input;
  return `XXXX XXXX ${digits.slice(-4)}`;
}

function maskPan(input) {
  if (typeof input !== 'string' || input.length < 4) return input;
  return `${'X'.repeat(input.length - 4)}${input.slice(-4)}`;
}

function toTitleCase(input) {
  if (typeof input !== 'string') return input;
  return input
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function calculateAge(input) {
  // input: ISO date string of birth
  const dob = new Date(input);
  if (Number.isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
}

function pickFields(input, args = {}) {
  const fields = args.fields || [];
  if (!input || typeof input !== 'object') return input;
  const result = {};
  for (const field of fields) result[field] = input[field];
  return result;
}

module.exports = { maskAadhaar, maskPan, toTitleCase, calculateAge, pickFields };
