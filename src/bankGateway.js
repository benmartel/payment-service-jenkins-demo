const { randomUUID } = require('node:crypto');

// Sandbox stand-in for the bank's API; latency mirrors a real sandbox round trip.
function createSandboxGateway({ latencyMs = 0 } = {}) {
  return {
    async submit(payment) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
      return { reference: randomUUID(), status: 'submitted', rail: payment.rail };
    },
  };
}

module.exports = { createSandboxGateway };
