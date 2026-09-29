const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canEditAnnouncement, canPublishAnnouncement } = require('./load-ts.cjs')('src/features/bulletin/model/permissions.ts');

test('bulletin publication allows all exco roles to publish', () => {
  assert.equal(canPublishAnnouncement('dev', 'finance'), true);
  assert.equal(canPublishAnnouncement('cr', 'finance'), true);
  assert.equal(canPublishAnnouncement('acr', 'finance'), true);
  assert.equal(canPublishAnnouncement('fin_sec', 'finance'), true);
  assert.equal(canPublishAnnouncement('fin_sec', 'general'), true);
  assert.equal(canPublishAnnouncement(undefined, 'general'), false);
});

test('all exco roles can edit active announcements even if they did not create them', () => {
  const ownDraft = { createdBy: 'user-1', category: 'general', status: 'draft' };
  const otherDraft = { ...ownDraft, createdBy: 'user-2' };
  const published = { ...ownDraft, status: 'published' };
  const publishedFinance = { ...published, category: 'finance' };

  // acr can edit own and others' draft
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'acr' }, ownDraft), true);
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'acr' }, otherDraft), true);
  // fin_sec can edit others' draft
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'fin_sec' }, otherDraft), true);
  // cr can edit published
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'cr' }, published), true);
  // fin_sec can edit published general and finance
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'fin_sec' }, publishedFinance), true);
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'fin_sec' }, published), true);
  // cannot edit archived
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'dev' }, { ...published, status: 'archived' }), false);
});
