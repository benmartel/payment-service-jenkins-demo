const HIGH_RISK_COUNTRIES = ['XA', 'XB', 'XC'];
const LARGE_AMOUNT = 25_000;
const BLOCK_SCORE = 70;
const REVIEW_SCORE = 40;

function scoreTransaction(txn) {
  let score = 0;
  if (txn.amount >= LARGE_AMOUNT) score += 30;
  if (txn.newDestination) score += 20;
  if (HIGH_RISK_COUNTRIES.includes(txn.country)) score += 40;
  if (txn.hour < 5) score += 10;
  if (txn.paymentsLastHour >= 5) score += 70;
  return Math.min(score, 100);
}

function decide(score) {
  if (score >= BLOCK_SCORE) return 'block';
  if (score >= REVIEW_SCORE) return 'review';
  return 'approve';
}

function evaluate(txn) {
  const score = scoreTransaction(txn);
  return { score, decision: decide(score) };
}

module.exports = { scoreTransaction, decide, evaluate, BLOCK_SCORE, REVIEW_SCORE };
