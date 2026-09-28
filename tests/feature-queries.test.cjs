const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const loadTs = require('./load-ts.cjs');
const remote = loadTs('src/hooks/useRemoteData.ts');
const picnic = loadTs('src/features/payments/model/picnic.ts');

test('submission pagination loads only its page; mutation refresh uses server totals', async () => {
  let eventReads = 0;
  const pageReads = [];
  let confirmed = 0;
  const { useSubmissionDetail } = loadTs('src/features/submissions/hooks/useSubmissionDetail.ts', {
    '../../../hooks/useRemoteData': remote,
    '../api/submissions': {
      getSubmissionEvent: async () => { eventReads++; return { id: 'event' }; },
      listSubmissions: async (id, page) => {
        pageReads.push(page);
        return { submissions: [], total: 100, confirmedTotal: confirmed, pendingTotal: 100 - confirmed, page, totalPages: 2 };
      },
    },
  });
  let state, view;
  function Probe() { state = useSubmissionDetail('event'); return null; }
  await act(async () => { view = create(React.createElement(Probe)); });
  await act(async () => state.setCurrentPage(2));
  assert.equal(eventReads, 1);
  assert.deepEqual(pageReads, [1, 2]);
  confirmed = 3;
  await act(async () => { await state.refresh(); });
  assert.equal(state.submissionStats.confirmed, 3);
  assert.equal(eventReads, 1);
  act(() => view.unmount());
});

test('Picnic local page/filter changes do not refetch legacy sources', async () => {
  let reads = 0;
  const { useReceiptList } = loadTs('src/features/payments/hooks/useReceiptList.ts', {
    '../../../hooks/useRemoteData': remote,
    '../model/picnic': picnic,
    '../api/receipts': {
      listLegacyReceipts: async () => { reads++; return []; },
      listReceipts: async () => { throw new Error('Unexpected normal query'); },
    },
  });
  let view;
  function Probe({ page, search }) { useReceiptList('event', true, page, search, 'confirmed'); return null; }
  await act(async () => { view = create(React.createElement(Probe, { page: 1, search: '' })); });
  assert.equal(reads, 2);
  await act(async () => view.update(React.createElement(Probe, { page: 2, search: 'student' })));
  assert.equal(reads, 2);
  act(() => view.unmount());
});
