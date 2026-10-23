// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Server code that charges credits uses in-memory credits in tests (no AWS).
// Only node tests run server code, and the AWS SDK won't load under jsdom.
if (typeof window === 'undefined') {
  const { setBillingBackends } = require('./lib/billing/charge');
  const { memoryBilling } = require('./lib/billing/testing');
  beforeEach(() => {
    const b = memoryBilling('agency');
    setBillingBackends(b.credits, b.ledger);
  });
}
