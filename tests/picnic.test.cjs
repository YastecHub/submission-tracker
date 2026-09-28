const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dedupePicnicReceipts } = require('./load-ts.cjs')('src/features/payments/model/picnic.ts');

test('legacy merge preserves earliest receipt, sources and collection state without mutating inputs', () => {
  const first = Object.freeze({ id: 'old', matricNumber: ' ab/1 ', submittedAt: '2026-01-01', sourceEventTitle: 'Legacy', isClaimed: false });
  const next = Object.freeze({ id: 'new', matricNumber: 'AB/1', submittedAt: '2026-02-01', sourceEventTitle: 'Current', isClaimed: true, claimedBy: 'Staff', claimedAt: '2026-03-01' });
  const result = dedupePicnicReceipts([first, next]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'old');
  assert.equal(result[0].isClaimed, true);
  assert.equal(result[0].claimedBy, 'Staff');
  assert.equal(result[0].sourceEventTitle, 'Legacy + Current');
  assert.equal(first.isClaimed, false);
});

test('legacy merge preserves a confirmed payment over an earlier pending duplicate', () => {
  const pending = { id: 'pending', matricNumber: 'AB/1', submittedAt: '2026-01-01', status: 'pending' };
  const confirmed = { id: 'confirmed', matricNumber: 'ab/1', submittedAt: '2026-02-01', status: 'confirmed' };
  const [result] = dedupePicnicReceipts([pending, confirmed]);
  assert.equal(result.id, 'confirmed');
  assert.equal(result.status, 'confirmed');
});
