const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');
const gpa = loadTs('src/features/gpa/model/gpa.ts');
const drafts = loadTs('src/features/gpa/model/drafts.ts', { './gpa': gpa });
const courses = loadTs('src/features/gpa/model/courses.ts', { './gpa': gpa, './drafts': drafts });
const csv = loadTs('src/features/gpa/model/csv.ts');

// Same examples as server/tests/gpaCalculator.test.ts, so both sides agree.
test('semester GPA and CGPA match the server calculator', () => {
  const totals = gpa.courseTotals([{ units: 3, grade: 'A' }, { units: 2, grade: 'B' }, { units: 3, grade: 'C' }, { units: 1, grade: 'F' }]);
  assert.equal(totals.gpa, 3.56);
  const summary = gpa.summarize([
    { status: 'finalized', courses: [{ units: 3, grade: 'F' }, { units: 3, grade: 'A' }] },
    { status: 'finalized', courses: [{ units: 3, grade: 'B' }] },
    { status: 'draft', courses: [{ units: 4, grade: 'A' }, { units: 2, grade: null }] },
  ]);
  assert.equal(summary.cgpa, 3);
  assert.equal(summary.projectedCgpa, 3.62);
  assert.equal(summary.degreeClass, 'Second Class Lower');
  assert.equal(gpa.roundGpa(4005, 1000), 4.01);
  assert.equal(gpa.normalizeCourseCode('pct201'), 'PCT 201');
  assert.equal(gpa.normalizeCourseCode('chm-cm101'), 'CHM-CM 101');
});

test('target planner works out the GPA needed next semester', () => {
  // 60 units at 4.00 (240 points); to reach 4.20 over 80 units you need 4.80 over the next 20.
  assert.equal(gpa.requiredGpa(240, 60, 4.2, 20), 4.8);
  assert.equal(gpa.requiredGpa(240, 60, 3.0, 20), 0);
  assert.ok(gpa.requiredGpa(240, 60, 4.9, 20) > 5);
});

test('the next semester to add follows the latest one', () => {
  assert.deepEqual(gpa.nextOpenSlot([]), { level: 100, semester: 1 });
  assert.deepEqual(gpa.nextOpenSlot([], 200), { level: 200, semester: 1 });
  assert.deepEqual(gpa.nextOpenSlot([{ level: 200, semester: 1 }]), { level: 200, semester: 2 });
  assert.deepEqual(gpa.nextOpenSlot([{ level: 200, semester: 1 }, { level: 200, semester: 2 }]), { level: 300, semester: 1 });
  assert.deepEqual(gpa.nextOpenSlot([{ level: 100, semester: 2 }]), { level: 200, semester: 1 });
});

test('unsynced edits on this device replace the saved copy in the view', () => {
  const record = {
    semesters: [
      { id: 's1', level: 200, semester: 1, sessionLabel: null, status: 'draft', finalizedAt: null, version: 3, updatedAt: '',
        courses: [{ id: 'c1', catalogCourseId: null, code: 'PCT 201', title: 'X', units: 3, grade: 'B', isCarryover: false, isRetake: false, sortOrder: 0 }], totals: {} },
    ],
    summary: {},
  };
  const local = {
    s1: { id: 's1', level: 200, semester: 1, sessionLabel: null, baseVersion: 3, revision: 2, updatedAt: 1, sync: 'pending', syncMessage: null,
      courses: [{ key: 'c1', catalogCourseId: null, code: 'PCT 201', title: 'X', units: 3, grade: 'A', isCarryover: false, isRetake: false }] },
    n1: { id: 'n1', level: 100, semester: 2, sessionLabel: null, baseVersion: null, revision: 1, updatedAt: 1, sync: 'pending', syncMessage: null, courses: [] },
  };
  const views = drafts.mergeSemesters(record, local);
  assert.deepEqual(views.map((view) => view.id), ['n1', 's1']); // ordered by level/semester
  assert.equal(views[1].courses[0].grade, 'A');
  assert.equal(views[1].totals.gpa, 5);
  assert.equal(views[1].sync, 'pending');
  assert.equal(views[1].version, 3);
});

test('retakes are suggested when a course was failed in an earlier semester', () => {
  const semesters = [
    { id: 'a', level: 200, semester: 1, courses: [{ code: 'PCT 201', grade: 'F' }] },
    { id: 'b', level: 200, semester: 2, courses: [] },
  ];
  assert.deepEqual(courses.previousAttempt(semesters, 'pct201', { level: 300, semester: 1 }), { grade: 'F', level: 200, semester: 1 });
  assert.equal(courses.previousAttempt(semesters, 'PCT 201', { level: 200, semester: 1 }), null);
  const added = courses.courseFromCatalog({ id: 'cat', code: 'PCT 201', title: 'T', units: 3, level: 200, semester: 1, isElective: false }, 'F');
  assert.equal(added.isRetake, true);
  assert.equal(added.grade, null);
});

test('course search ranks code matches before title matches', () => {
  const catalog = [
    { id: '1', code: 'PCH 201', title: 'Pharmaceutical Chemistry', units: 3, level: 200, semester: 1 },
    { id: '2', code: 'PCT 201', title: 'Physical Pharmacy', units: 2, level: 200, semester: 1 },
    { id: '3', code: 'ZZZ 300', title: 'Pharmacy practice pct notes', units: 2, level: 300, semester: 1 },
  ];
  assert.deepEqual(courses.searchCatalog(catalog, 'pct').map((course) => course.code), ['PCT 201', 'ZZZ 300']);
  assert.deepEqual(courses.searchCatalog(catalog, 'pc').map((course) => course.code), ['PCH 201', 'PCT 201', 'ZZZ 300']);
  assert.deepEqual(courses.searchCatalog(catalog, '  '), []);
});

test('CSV backup uses the import format and escapes values', () => {
  const text = csv.exportRecordCsv([{ level: 200, semester: 1, sessionLabel: '2025/2026', courses: [
    { code: 'PCT 201', title: 'Drugs, Doses "and" More', units: 3, grade: 'A', isCarryover: false, isRetake: true },
    { code: 'PCT 202', title: 'Pending', units: 2, grade: null, isCarryover: true, isRetake: false },
  ] }]);
  assert.equal(text, [
    'level,semester,code,title,units,grade,carryover,retake,session',
    '200,1,PCT 201,"Drugs, Doses ""and"" More",3,A,no,yes,2025/2026',
    '200,1,PCT 202,Pending,2,,yes,no,2025/2026',
    '',
  ].join('\n'));
  assert.match(csv.importTemplate(), /^# NEXIUM GPA tracker/);
  assert.ok(csv.importTemplate().includes('\nlevel,semester,code,title,units,grade,carryover,retake,session\n'));
});

test('six-year programme: 100L-600L and sessions 2025/2026 to 2030/2031', () => {
  assert.deepEqual([...gpa.LEVELS], [100, 200, 300, 400, 500, 600]);
  assert.equal(gpa.sessionForLevel(100), '2025/2026');
  assert.equal(gpa.sessionForLevel(600), '2030/2031');
  assert.deepEqual([...gpa.SESSIONS], ['2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030', '2030/2031']);
});

test('course rows keep the same key after the server saves them (no re-mount, no jump)', () => {
  const catalogCourse = { id: 'cat-1', code: 'COS 101', title: 'Intro', units: 3, level: 100, semester: 1, isElective: false };
  const local = courses.courseFromCatalog(catalogCourse);
  const saved = drafts.coursesFromServer({ id: 's', level: 100, semester: 1, sessionLabel: null, status: 'draft', finalizedAt: null, version: 2, updatedAt: '',
    courses: [{ id: 'server-id-9', catalogCourseId: 'cat-1', code: 'COS 101', title: 'Intro', units: 3, grade: 'A', isCarryover: false, isRetake: false, sortOrder: 0 }],
    totals: { units: 3, points: 15, gpa: 5, gradedCourses: 1, pendingCourses: 0, pendingUnits: 0 } });
  assert.equal(saved[0].key, local.key);
});
