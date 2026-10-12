const { test } = require('node:test');
const assert = require('node:assert/strict');
const { safeStudentReturnTo } = require('./load-ts.cjs')('src/features/student-auth/model/returnTo.ts');

test('students return to the page they were trying to open', () => {
  assert.equal(safeStudentReturnTo('/student/news/exam-update'), '/student/news/exam-update');
  assert.equal(safeStudentReturnTo('/student/news?category=finance'), '/student/news?category=finance');
  assert.equal(safeStudentReturnTo('/student/tickets'), '/student/tickets');
  assert.equal(safeStudentReturnTo('/transparency'), '/transparency');
  assert.equal(safeStudentReturnTo('/payment/pay-dues-ab12/success?id=1'), '/payment/pay-dues-ab12/success?id=1');
  assert.equal(safeStudentReturnTo('/student'), '/student');
});

test('unsafe or non-student destinations fall back to the student home', () => {
  assert.equal(safeStudentReturnTo(null), '/student');
  assert.equal(safeStudentReturnTo('https://evil.example/student'), '/student');
  assert.equal(safeStudentReturnTo('//evil.example/student'), '/student');
  assert.equal(safeStudentReturnTo('/\\evil.example'), '/student');
  assert.equal(safeStudentReturnTo('/dashboard'), '/student');
  assert.equal(safeStudentReturnTo('/studentfake'), '/student');
  assert.equal(safeStudentReturnTo('/transparency-x'), '/student');
});
