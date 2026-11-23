const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validatePayment, chooseRail, calculateFee } = require('../../src/routing');

const valid = { amount: 500, currency: 'USD', destination: 'acct_123', country: 'US' };

test('accepts a valid payment', () => {
  assert.deepEqual(validatePayment(valid), []);
});

test('rejects a missing body', () => {
  assert.deepEqual(validatePayment(undefined), ['payment body is required']);
});

test('rejects non-positive amounts', () => {
  assert.equal(validatePayment({ ...valid, amount: 0 }).length, 1);
  assert.equal(validatePayment({ ...valid, amount: -5 }).length, 1);
});

test('rejects unsupported currencies', () => {
  assert.match(validatePayment({ ...valid, currency: 'JPY' })[0], /currency/);
});

test('rejects a bad country code', () => {
  assert.match(validatePayment({ ...valid, country: 'USA' })[0], /country/);
});

test('routes domestic payments under the threshold to ACH', () => {
  assert.equal(chooseRail({ amount: 9_999, country: 'US' }), 'ach');
});

test('routes domestic payments at or above the threshold to wire', () => {
  assert.equal(chooseRail({ amount: 10_000, country: 'US' }), 'wire');
});

test('routes international payments to SWIFT', () => {
  assert.equal(chooseRail({ amount: 100, country: 'GB' }), 'swift');
});

test('charges a flat ACH fee', () => {
  assert.equal(calculateFee('ach', 5_000), 0.25);
});

test('charges a flat wire fee', () => {
  assert.equal(calculateFee('wire', 50_000), 15);
});

test('charges SWIFT a base fee plus 0.1%', () => {
  assert.equal(calculateFee('swift', 10_000), 35);
});

test('throws on an unknown rail', () => {
  assert.throws(() => calculateFee('carrier-pigeon', 1), /unknown rail/);
});
