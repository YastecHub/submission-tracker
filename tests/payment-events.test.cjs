const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

test('dashboard payment events use the server summary without downloading receipts', async () => {
  const api = { get: async () => ({ data: { events: [
    { id: 'picnic', title: 'Picnic', totalReceipts: 3, confirmedCount: 3 },
    { id: 'other', title: 'Other', totalReceipts: 4, confirmedCount: 3 },
  ] } }) };
  const { listPaymentEvents } = loadTs('src/features/payments/api/events.ts', {
    '../../../api/axios': { default: api, __esModule: true },
  });
  const events = await listPaymentEvents(new AbortController().signal);
  assert.equal(events[0].confirmedCount, 3);
  assert.equal(events[0].totalReceipts, 3);
  assert.equal(events[1].confirmedCount, 3);
});
