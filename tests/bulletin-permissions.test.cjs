const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canEditAnnouncement, canPublishAnnouncement } = require('./load-ts.cjs')('src/features/bulletin/model/permissions.ts');

test('bulletin publication remains category-specific', () => {
  assert.equal(canPublishAnnouncement('cr', 'academic'), true);
  assert.equal(canPublishAnnouncement('cr', 'finance'), false);
  assert.equal(canPublishAnnouncement('fin_sec', 'finance'), true);
  assert.equal(canPublishAnnouncement('acr', 'general'), false);
  assert.equal(canPublishAnnouncement('dev', 'finance'), true);
});

test('bulletin viewing does not grant editing rights', () => {
  const ownDraft = { createdBy: 'user-1', category: 'general', status: 'draft' };
  const otherDraft = { ...ownDraft, createdBy: 'user-2' };
  const published = { ...ownDraft, status: 'published' };

  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'acr' }, ownDraft), true);
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'acr' }, otherDraft), false);
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'acr' }, published), false);
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'cr' }, published), true);
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'fin_sec' }, { ...published, category: 'finance' }), true);
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'dev' }, { ...published, status: 'archived' }), false);
});
