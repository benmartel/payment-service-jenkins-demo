const express = require('express');
const { validatePayment, chooseRail, calculateFee } = require('./routing');
const { evaluate } = require('./fraud');
const { createSandboxGateway } = require('./bankGateway');

function createApp({ gateway = createSandboxGateway() } = {}) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  app.post('/api/payments', async (req, res) => {
    const errors = validatePayment(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const payment = req.body;
    const fraud = evaluate({
      amount: payment.amount,
      country: payment.country,
      newDestination: Boolean(payment.newDestination),
      hour: new Date().getUTCHours(),
      paymentsLastHour: payment.paymentsLastHour ?? 0,
    });

    if (fraud.decision === 'block') {
      return res.status(422).json({ status: 'blocked', fraudScore: fraud.score });
    }

    const rail = chooseRail(payment);
    const fee = calculateFee(rail, payment.amount);
    const submission = await gateway.submit({ ...payment, rail });

    res.status(201).json({
      status: fraud.decision === 'review' ? 'pending_review' : submission.status,
      reference: submission.reference,
      rail,
      fee,
      fraudScore: fraud.score,
    });
  });

  return app;
}

module.exports = { createApp };
