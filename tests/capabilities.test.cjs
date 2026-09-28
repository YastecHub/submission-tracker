const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dashboardCapabilities } = require('./load-ts.cjs')('src/features/auth/model/capabilities.ts');

test('dashboard capabilities match backend role contracts', () => {
  assert.deepEqual(dashboardCapabilities('acr'), { submissions: true, payments: false, ledger: false });
  assert.deepEqual(dashboardCapabilities('cr'), { submissions: true, payments: true, ledger: false });
  assert.deepEqual(dashboardCapabilities('fin_sec'), { submissions: false, payments: true, ledger: true });
  assert.deepEqual(dashboardCapabilities('dev'), { submissions: true, payments: true, ledger: true });
});
