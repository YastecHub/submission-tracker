const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { studentFirstName } = loadTs('src/utils/studentName.ts');
const { DAYS_IN_MONTH, MONTHS } = loadTs('src/features/birthdays/model/types.ts');

test('students are greeted by their first name, also with "SURNAME, Firstname" class-list names', () => {
  assert.equal(studentFirstName('OYEBO, Yasir Oladimeji'), 'Yasir');
  assert.equal(studentFirstName('Yasir Oladimeji Oyebo'), 'Yasir');
  assert.equal(studentFirstName('Iragbonse Joanne'), 'Iragbonse');
  assert.equal(studentFirstName('', 'there'), 'there');
  assert.equal(studentFirstName(undefined), 'Student');
});

test('the birthday form offers every real date, including 29 February', () => {
  assert.equal(MONTHS.length, 12);
  assert.equal(DAYS_IN_MONTH[1], 29);
  assert.equal(DAYS_IN_MONTH[3], 30);
  assert.equal(DAYS_IN_MONTH.reduce((sum, days) => sum + days, 0), 366);
});
