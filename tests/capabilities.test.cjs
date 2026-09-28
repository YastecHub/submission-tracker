const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dashboardCapabilities, canManageSubmissionEvent, canManagePaymentEvent } = require('./load-ts.cjs')('src/features/auth/model/capabilities.ts');

test('dashboard capabilities match backend role contracts', () => {
  assert.deepEqual(dashboardCapabilities('acr'), { submissions: true, payments: true, ledger: true, createSubmissions: true, createPayments: false, manageLedger: false });
  assert.deepEqual(dashboardCapabilities('cr'), { submissions: true, payments: true, ledger: true, createSubmissions: true, createPayments: true, manageLedger: false });
  assert.deepEqual(dashboardCapabilities('fin_sec'), { submissions: true, payments: true, ledger: true, createSubmissions: false, createPayments: true, manageLedger: true });
  assert.deepEqual(dashboardCapabilities('dev'), { submissions: true, payments: true, ledger: true, createSubmissions: true, createPayments: true, manageLedger: true });
});

test('view access does not grant event mutation access', () => {
  assert.equal(canManageSubmissionEvent('acr', 'user-1', 'user-1'), true);
  assert.equal(canManageSubmissionEvent('acr', 'user-1', 'user-2'), false);
  assert.equal(canManageSubmissionEvent('fin_sec', 'user-1', 'user-1'), false);
  assert.equal(canManageSubmissionEvent('dev', 'user-1', 'user-2'), true);

  assert.equal(canManagePaymentEvent('cr', 'user-1', 'user-1'), true);
  assert.equal(canManagePaymentEvent('cr', 'user-1', 'user-2'), false);
  assert.equal(canManagePaymentEvent('acr', 'user-1', 'user-1'), false);
  assert.equal(canManagePaymentEvent('fin_sec', 'user-1', 'user-2'), true);
});
