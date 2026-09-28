const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const loadTs = require('./load-ts.cjs');

function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}

test('camera stops when startup finishes after unmount', async () => {
  const startup = deferred();
  let stops = 0;
  class Camera {
    start() { return startup.promise; }
    async stop() { stops++; }
  }
  const { useTicketCamera } = loadTs('src/features/payments/hooks/useTicketCamera.ts', {
    'html5-qrcode': { Html5Qrcode: Camera },
  });
  function Probe() { useTicketCamera(true, () => {}); return null; }
  let view;
  await act(async () => { view = create(React.createElement(Probe)); });
  act(() => view.unmount());
  await act(async () => startup.resolve());
  assert.equal(stops, 1);
});

test('camera accepts only the first decoded frame', async () => {
  let success;
  let stops = 0;
  class Camera {
    async start(_source, _config, onSuccess) { success = onSuccess; }
    async stop() { stops++; }
  }
  const { useTicketCamera } = loadTs('src/features/payments/hooks/useTicketCamera.ts', {
    'html5-qrcode': { Html5Qrcode: Camera },
  });
  const scans = [];
  function Probe() { useTicketCamera(true, (code) => scans.push(code)); return null; }
  let view;
  await act(async () => { view = create(React.createElement(Probe)); });
  await act(async () => { success('first'); success('duplicate'); });
  assert.deepEqual(scans, ['first']);
  assert.equal(stops, 1);
  act(() => view.unmount());
});
