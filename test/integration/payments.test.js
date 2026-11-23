const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createSandboxGateway } = require('../../src/bankGateway');

const SANDBOX_LATENCY_MS = Number(process.env.SANDBOX_LATENCY_MS ?? 300);
const FLOWS_PER_SCENARIO = 20;

const scenarios = [
  { name: 'domestic ACH payment', body: { amount: 1_250, currency: 'USD', country: 'US' }, status: 201, rail: 'ach' },
  { name: 'domestic wire payment', body: { amount: 18_000, currency: 'USD', country: 'US' }, status: 201, rail: 'wire' },
  { name: 'international SWIFT payment', body: { amount: 4_000, currency: 'EUR', country: 'DE' }, status: 201, rail: 'swift' },
  { name: 'large payment to a new payee held for review', body: { amount: 40_000, currency: 'USD', country: 'US', newDestination: true }, status: 201, rail: 'wire', paymentStatus: 'pending_review' },
];

let server;
let baseUrl;

before(async () => {
  const app = createApp({ gateway: createSandboxGateway({ latencyMs: SANDBOX_LATENCY_MS }) });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function postPayment(body) {
  const res = await fetch(`${baseUrl}/api/payments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test('health check responds', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'healthy' });
});

test('invalid payments are rejected before reaching the bank', async () => {
  const res = await postPayment({ amount: -1, currency: 'USD', destination: 'acct_1', country: 'US' });
  assert.equal(res.status, 400);
});

test('payments to high-risk countries are blocked before reaching the bank', async () => {
  const res = await postPayment({ amount: 30_000, currency: 'USD', destination: 'acct_1', country: 'XA' });
  assert.equal(res.status, 422);
  assert.equal(res.body.status, 'blocked');
});

for (const scenario of scenarios) {
  describe(scenario.name, () => {
    for (let i = 1; i <= FLOWS_PER_SCENARIO; i++) {
      test(`end-to-end flow ${i} through the bank sandbox`, async () => {
        const res = await postPayment({ ...scenario.body, destination: `acct_${i}` });
        assert.equal(res.status, scenario.status);
        assert.equal(res.body.rail, scenario.rail);
        assert.equal(res.body.status, scenario.paymentStatus ?? 'submitted');
        assert.ok(res.body.reference);
      });
    }
  });
}
