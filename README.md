# payment-service

Payment routing API with fraud scoring, used to demo a Jenkins declarative pipeline.

- `POST /api/payments` validates a payment, scores it for fraud, picks a rail (ACH, wire, SWIFT) and submits it to a sandbox bank gateway.
- `GET /health` health check.

## Checks

| Script | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run test:unit` | Routing, fee and fraud-rule unit tests |
| `npm run test:integration` | End-to-end payment flows against the bank sandbox (~300ms per call) |
| `npm run test:fraud` | Replays 350M synthetic historical transactions and fails if block or review rates exceed business limits |
| `npm run audit` | `npm audit` on production dependencies |
| `npm run package` | Builds the release tarball into `dist/` |
| `npm run smoke` | Starts the service and sends it real traffic |

The `Jenkinsfile` runs the checks in parallel across agents, then packages, smoke-tests, waits for approval and deploys (the deploy is simulated).
