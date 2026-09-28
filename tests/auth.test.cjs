const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const loadTs = require('./load-ts.cjs');
const axios = require('axios');

test('session restores on public landing; late bootstrap cannot overwrite a new login', async () => {
  const storage = new Map([['token', 'old-token']]);
  global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  global.window = { location: { pathname: '/login' } };
  let resolveBootstrap;
  const user = { id: 'new', name: 'Staff', role: 'cr' };
  const { AuthProvider, useAuth } = loadTs('src/context/AuthContext.tsx', {
    '../features/auth/api/auth': {
      getCurrentUser: () => new Promise((resolve) => { resolveBootstrap = resolve; }),
      signIn: async () => ({ token: 'new-token', user }),
    },
  });
  let state, view;
  function Probe() { state = useAuth(); return null; }
  await act(async () => { view = create(React.createElement(AuthProvider, null, React.createElement(Probe))); });
  assert.equal(typeof resolveBootstrap, 'function');
  await act(async () => { await state.login('staff@example.test', 'password'); });
  await act(async () => resolveBootstrap({ id: 'old' }));
  assert.equal(state.user.id, 'new');
  assert.equal(storage.get('token'), 'new-token');
  act(() => state.logout());
  assert.equal(state.user, null);
  assert.equal(storage.has('token'), false);
  act(() => view.unmount());
  delete global.localStorage;
  delete global.window;
});

test('temporary session restore failure remains recoverable without deleting the token', async () => {
  const storage = new Map([['token', 'valid-token']]);
  global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  let attempts = 0;
  const user = { id: 'user', name: 'Staff', role: 'cr' };
  const { AuthProvider, useAuth } = loadTs('src/context/AuthContext.tsx', {
    '../features/auth/api/auth': {
      getCurrentUser: async () => {
        attempts++;
        if (attempts === 1) throw new axios.AxiosError('offline');
        return user;
      },
      signIn: async () => { throw new Error('Unexpected login'); },
    },
  });
  let state, view;
  function Probe() { state = useAuth(); return null; }
  await act(async () => { view = create(React.createElement(AuthProvider, null, React.createElement(Probe))); });
  assert.equal(state.sessionError, true);
  assert.equal(storage.get('token'), 'valid-token');
  await act(async () => state.retrySession());
  assert.equal(state.sessionError, false);
  assert.equal(state.user.id, 'user');
  act(() => view.unmount());
  delete global.localStorage;
});

test('temporary student session failure keeps the token and retries safely', async () => {
  const storage = new Map([['studentToken', 'student-token']]);
  global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  let attempts = 0;
  const student = { id: 'student', matricNumber: '251106001', email: 'student@example.test', fullName: 'Student Name' };
  const { StudentAuthProvider, useStudentAuth } = loadTs('src/context/StudentAuthContext.tsx', {
    '../features/student-auth/api/studentAuth': {
      getStudent: async () => {
        attempts++;
        if (attempts === 1) throw new axios.AxiosError('offline');
        return student;
      },
      loginStudent: async () => { throw new Error('Unexpected login'); },
      registerStudent: async () => { throw new Error('Unexpected registration'); },
      requestStudentRegistrationCode: async () => { throw new Error('Unexpected code request'); },
    },
  });
  let state, view;
  function Probe() { state = useStudentAuth(); return null; }
  await act(async () => { view = create(React.createElement(StudentAuthProvider, null, React.createElement(Probe))); });
  assert.equal(state.sessionError, true);
  assert.equal(storage.get('studentToken'), 'student-token');
  await act(async () => state.retrySession());
  assert.equal(state.sessionError, false);
  assert.equal(state.student.id, 'student');
  act(() => view.unmount());
  delete global.localStorage;
});
