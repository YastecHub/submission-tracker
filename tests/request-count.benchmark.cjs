const React = require('react');
const { create, act } = require('react-test-renderer');
const loadTs = require('./load-ts.cjs');
const remote = loadTs('src/hooks/useRemoteData.ts');
const picnic = loadTs('src/features/payments/model/picnic.ts');

async function main() {
  let sourceReads = 0;
  const { useReceiptList } = loadTs('src/features/payments/hooks/useReceiptList.ts', {
    '../../../hooks/useRemoteData': remote,
    '../model/picnic': picnic,
    '../api/receipts': {
      listLegacyReceipts: async () => { sourceReads++; return []; },
      listReceipts: async () => { throw new Error('Unexpected normal query'); },
    },
  });
  function Probe() {
    useReceiptList(picnic.PICNIC_PAYMENT_EVENT_ID, true, 1, '', '');
    return null;
  }
  let view;
  await act(async () => { view = create(React.createElement(Probe)); });
  await act(async () => view.update(React.createElement(Probe)));
  act(() => view.unmount());
  console.log(JSON.stringify({ journey: 'combined-payment-detail-initial-load', sourceReads }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
