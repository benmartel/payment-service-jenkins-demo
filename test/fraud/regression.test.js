const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../../src/fraud');

// Replays a deterministic set of synthetic historical transactions against the
// current fraud rules and checks the outcomes stay within agreed business limits.
const SAMPLE_SIZE = Number(process.env.FRAUD_SAMPLE_SIZE ?? 350_000_000);
const MAX_BLOCK_RATE = 0.01;
const MAX_REVIEW_RATE = 0.06;

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function syntheticTransaction(rand) {
  const r = rand();
  return {
    amount: Math.round(Math.exp(rand() * 11)),
    country: r < 0.015 ? 'XA' : r < 0.2 ? 'GB' : 'US',
    newDestination: rand() < 0.1,
    hour: Math.floor(rand() * 24),
    paymentsLastHour: rand() < 0.03 ? 6 : Math.floor(rand() * 3),
  };
}

const knownFraud = [
  { name: 'large transfer to a high-risk country', txn: { amount: 50_000, country: 'XA', newDestination: false, hour: 12, paymentsLastHour: 0 } },
  { name: 'account takeover burst to a new payee', txn: { amount: 30_000, country: 'US', newDestination: true, hour: 3, paymentsLastHour: 9 } },
  { name: 'high-risk country, new payee, overnight', txn: { amount: 900, country: 'XB', newDestination: true, hour: 2, paymentsLastHour: 1 } },
];

for (const { name, txn } of knownFraud) {
  test(`known fraud pattern is blocked: ${name}`, () => {
    assert.equal(evaluate(txn).decision, 'block');
  });
}

test(`replay of ${SAMPLE_SIZE.toLocaleString('en-US')} historical transactions stays within business limits`, () => {
  const rand = seededRandom(42);
  const counts = { approve: 0, review: 0, block: 0 };
  for (let i = 0; i < SAMPLE_SIZE; i++) {
    counts[evaluate(syntheticTransaction(rand)).decision]++;
  }

  const blockRate = counts.block / SAMPLE_SIZE;
  const reviewRate = counts.review / SAMPLE_SIZE;
  console.log(`approve ${counts.approve}, review ${counts.review} (${(reviewRate * 100).toFixed(2)}%), block ${counts.block} (${(blockRate * 100).toFixed(2)}%)`);

  assert.ok(blockRate <= MAX_BLOCK_RATE,
    `block rate ${(blockRate * 100).toFixed(2)}% exceeds the ${MAX_BLOCK_RATE * 100}% ceiling: these rules would block legitimate customers`);
  assert.ok(reviewRate <= MAX_REVIEW_RATE,
    `review rate ${(reviewRate * 100).toFixed(2)}% exceeds the ${MAX_REVIEW_RATE * 100}% ceiling: the ops review queue cannot absorb this volume`);
});
