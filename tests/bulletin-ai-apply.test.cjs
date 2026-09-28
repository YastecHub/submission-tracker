const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyAiSuggestion } = require('./load-ts.cjs')('src/features/bulletin/model/applyAiSuggestion.ts');

const current = {
  title: 'Current title', summary: 'Current summary', category: 'general', priority: 'normal',
  sections: [{ id: 'current', heading: null, body: 'Current body' }],
};
const response = {
  runId: 'run-1',
  suggestion: {
    title: { value: 'Suggested title', sourceQuotes: ['source'] },
    summary: { value: 'Suggested summary', sourceQuotes: ['source'] },
    category: { value: 'academic', reason: 'reason' },
    priority: { value: 'important', reason: 'reason' },
    sections: [
      { id: 'one', heading: 'One', body: 'Body one', sourceQuotes: ['source'] },
      { id: 'two', heading: 'Two', body: 'Body two', sourceQuotes: ['source'] },
    ],
    warnings: [], splitSuggestions: [],
  },
  audit: { provider: 'test', model: 'test', promptVersion: 'v1', createdAt: new Date(0).toISOString() },
};

test('applies only selected assistant fields and sections', () => {
  const result = applyAiSuggestion(current, response, ['title', 'sections'], ['two']);
  assert.equal(result.draft.title, 'Suggested title');
  assert.equal(result.draft.summary, 'Current summary');
  assert.equal(result.draft.category, 'general');
  assert.deepEqual(result.draft.sections, [{ id: 'two', heading: 'Two', body: 'Body two' }]);
  assert.deepEqual(result.review, { runId: 'run-1', acceptedFields: ['title', 'sections'], acceptedSectionIds: ['two'] });
});
