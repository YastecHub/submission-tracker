const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dashboardCapabilities, canManageSubmissionEvent, canManagePaymentEvent } = require('./load-ts.cjs')('src/features/auth/model/capabilities.ts');

test('dashboard capabilities provide equal rights for all exco roles', () => {
  const expectedEqual = { submissions: true, payments: true, ledger: true, createSubmissions: true, createPayments: true, manageLedger: true };
  assert.deepEqual(dashboardCapabilities('acr'), expectedEqual);
  assert.deepEqual(dashboardCapabilities('cr'), expectedEqual);
  assert.deepEqual(dashboardCapabilities('fin_sec'), expectedEqual);
  assert.deepEqual(dashboardCapabilities('dev'), expectedEqual);
});

test('event management access is granted to all staff roles', () => {
  assert.equal(canManageSubmissionEvent('acr', 'user-1', 'user-1'), true);
  assert.equal(canManageSubmissionEvent('acr', 'user-1', 'user-2'), true);
  assert.equal(canManageSubmissionEvent('fin_sec', 'user-1', 'user-1'), true);
  assert.equal(canManageSubmissionEvent('dev', 'user-1', 'user-2'), true);
  assert.equal(canManageSubmissionEvent(undefined, 'user-1', 'user-2'), false);

  assert.equal(canManagePaymentEvent('cr', 'user-1', 'user-1'), true);
  assert.equal(canManagePaymentEvent('cr', 'user-1', 'user-2'), true);
  assert.equal(canManagePaymentEvent('acr', 'user-1', 'user-1'), true);
  assert.equal(canManagePaymentEvent('fin_sec', 'user-1', 'user-2'), true);
  assert.equal(canManagePaymentEvent(undefined, 'user-1', 'user-2'), false);
});
