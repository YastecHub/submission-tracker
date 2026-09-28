const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { useRemoteData } = require('./load-ts.cjs')('src/hooks/useRemoteData.ts');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('changing query aborts old request and ignores its late result', async () => {
  const old = deferred(), next = deferred();
  let state, signal;
  function Probe({ load }) { state = useRemoteData(load); return null; }
  const first = (s) => { signal = s; return old.promise; };
  const second = () => next.promise;
  let view;
  await act(async () => { view = create(React.createElement(Probe, { load: first })); });
  assert.equal(state.loading, true);
  await act(async () => { view.update(React.createElement(Probe, { load: second })); });
  assert.equal(signal.aborted, true);
  await act(async () => next.resolve(['new page']));
  await act(async () => old.resolve(['old page']));
  assert.deepEqual(state.data, ['new page']);
  assert.equal(state.loading, false);
  act(() => view.unmount());
});

test('empty success, failed refresh, retry, and unmount have distinct lifecycles', async () => {
  let state, signal;
  let request = deferred();
  const load = (s) => { signal = s; return request.promise; };
  function Probe() { state = useRemoteData(load); return null; }
  let view;
  await act(async () => { view = create(React.createElement(Probe)); });
  await act(async () => request.resolve([]));
  assert.deepEqual(state.data, []);
  assert.equal(state.error, false);
  request = deferred();
  act(() => { void state.refresh(true); });
  await act(async () => request.reject(new Error('offline')));
  assert.equal(state.error, true);
  assert.deepEqual(state.data, []);
  request = deferred();
  act(() => { void state.refresh(); });
  await act(async () => request.resolve(['after mutation']));
  assert.equal(state.error, false);
  assert.deepEqual(state.data, ['after mutation']);
  request = deferred();
  act(() => { void state.refresh(); });
  act(() => view.unmount());
  assert.equal(signal.aborted, true);
  await act(async () => request.resolve(['late']));
});
