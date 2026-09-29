const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canEditAnnouncement, canPublishAnnouncement } = require('./load-ts.cjs')('src/features/bulletin/model/permissions.ts');

test('bulletin publication remains category-specific', () => {
  // dev, cr, acr can publish any category
  assert.equal(canPublishAnnouncement('dev', 'finance'), true);
  assert.equal(canPublishAnnouncement('cr', 'finance'), true);
  assert.equal(canPublishAnnouncement('acr', 'finance'), true);
  assert.equal(canPublishAnnouncement('cr', 'academic'), true);
  // fin_sec can only publish finance
  assert.equal(canPublishAnnouncement('fin_sec', 'finance'), true);
  assert.equal(canPublishAnnouncement('fin_sec', 'general'), false);
});

test('bulletin viewing does not grant editing rights', () => {
  const ownDraft = { createdBy: 'user-1', category: 'general', status: 'draft' };
  const otherDraft = { ...ownDraft, createdBy: 'user-2' };
  const published = { ...ownDraft, status: 'published' };
  const publishedFinance = { ...published, category: 'finance' };

  // acr can edit own draft
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'acr' }, ownDraft), true);
  // acr CAN edit other's draft because they manage any category
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'acr' }, otherDraft), true);
  // acr CAN edit published (any category) because they manage any
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'acr' }, published), true);
  // cr CAN edit published (any category) because they manage any
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'cr' }, published), true);
  // fin_sec CAN edit published finance because they can publish finance
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'fin_sec' }, publishedFinance), true);
  // dev cannot edit archived
  assert.equal(canEditAnnouncement({ id: 'user-1', role: 'dev' }, { ...published, status: 'archived' }), false);
});
