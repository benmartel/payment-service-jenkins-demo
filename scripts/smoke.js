// Starts the packaged service and checks it serves real traffic.
const { spawn } = require('node:child_process');
const path = require('node:path');

const port = Number(process.env.SMOKE_PORT) || 3100;
const server = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'server.js')], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'inherit',
});

async function waitForHealthy(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`service did not become healthy at ${url}`);
}

async function main() {
  const base = `http://127.0.0.1:${port}`;
  await waitForHealthy(`${base}/health`);
  console.log('smoke: /health OK');

  const res = await fetch(`${base}/api/payments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount: 125, currency: 'USD', destination: 'acct_smoke', country: 'US' }),
  });
  const body = await res.json();
  if (res.status !== 201 || body.rail !== 'ach') {
    throw new Error(`unexpected payment response ${res.status}: ${JSON.stringify(body)}`);
  }
  console.log(`smoke: payment routed via ${body.rail}, reference ${body.reference}`);
}

main()
  .then(() => {
    server.kill('SIGTERM');
    console.log('smoke: PASSED');
  })
  .catch((err) => {
    server.kill('SIGTERM');
    console.error(`smoke: FAILED - ${err.message}`);
    process.exit(1);
  });
