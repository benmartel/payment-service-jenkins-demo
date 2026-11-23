const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreTransaction, decide, evaluate } = require('../../src/fraud');

const ordinary = { amount: 200, country: 'US', newDestination: false, hour: 14, paymentsLastHour: 0 };

test('an ordinary payment scores zero and is approved', () => {
  assert.deepEqual(evaluate(ordinary), { score: 0, decision: 'approve' });
});

test('a new destination alone is approved', () => {
  assert.equal(evaluate({ ...ordinary, newDestination: true }).decision, 'approve');
});

test('a large payment to a new destination goes to review', () => {
  assert.equal(evaluate({ ...ordinary, amount: 30_000, newDestination: true }).decision, 'review');
});

test('a large payment to a high-risk country is blocked', () => {
  assert.equal(evaluate({ ...ordinary, amount: 30_000, country: 'XA' }).decision, 'block');
});

test('rapid-fire payments at night to a new destination go to review', () => {
  assert.equal(evaluate({ ...ordinary, hour: 3, paymentsLastHour: 8, newDestination: true }).decision, 'review');
});

test('scores are capped at 100', () => {
  const worst = { amount: 99_999, country: 'XB', newDestination: true, hour: 2, paymentsLastHour: 20 };
  assert.equal(scoreTransaction(worst), 100);
});

test('decision thresholds are applied at their boundaries', () => {
  assert.equal(decide(39), 'approve');
  assert.equal(decide(40), 'review');
  assert.equal(decide(69), 'review');
  assert.equal(decide(70), 'block');
});
