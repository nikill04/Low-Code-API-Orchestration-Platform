// Aggregation helpers used when a workflow merges results from several
// vendor calls into one decision (see sample-configs/document-verification.json).

function averageScore(input) {
  const values = Array.isArray(input) ? input.filter((v) => typeof v === 'number') : [];
  if (!values.length) return 0;
  return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2));
}

function decideByThreshold(input, args = {}) {
  const threshold = args.threshold ?? 0.75;
  const score = typeof input === 'number' ? input : 0;
  return score >= threshold ? 'APPROVED' : 'REJECTED';
}

function mergeObjects(input) {
  if (!Array.isArray(input)) return input;
  return input.reduce((acc, obj) => ({ ...acc, ...(obj || {}) }), {});
}

module.exports = { averageScore, decideByThreshold, mergeObjects };
