const WIRE_THRESHOLD = 10_000;
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'];

function validatePayment(payment) {
  const errors = [];
  if (!payment || typeof payment !== 'object') return ['payment body is required'];
  if (typeof payment.amount !== 'number' || !(payment.amount > 0)) errors.push('amount must be a positive number');
  if (!SUPPORTED_CURRENCIES.includes(payment.currency)) errors.push(`currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}`);
  if (typeof payment.destination !== 'string' || payment.destination.length === 0) errors.push('destination is required');
  if (typeof payment.country !== 'string' || payment.country.length !== 2) errors.push('country must be a 2-letter code');
  return errors;
}

function chooseRail({ amount, country }) {
  if (country !== 'US') return 'swift';
  if (amount >= WIRE_THRESHOLD) return 'wire';
  return 'ach';
}

function calculateFee(rail, amount) {
  switch (rail) {
    case 'ach':
      return 0.25;
    case 'wire':
      return 15;
    case 'swift':
      return Math.round((25 + amount * 0.001) * 100) / 100;
    default:
      throw new Error(`unknown rail: ${rail}`);
  }
}

module.exports = { validatePayment, chooseRail, calculateFee, WIRE_THRESHOLD, SUPPORTED_CURRENCIES };
