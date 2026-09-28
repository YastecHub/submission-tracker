import type {
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementSection,
  BulletinAiOrganizationResponse,
  BulletinAiReview,
  BulletinAiReviewField,
} from './types';

export interface AiApplicableDraft {
  title: string;
  summary: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  sections: AnnouncementSection[];
}

export function applyAiSuggestion(
  current: AiApplicableDraft,
  response: BulletinAiOrganizationResponse,
  acceptedFields: BulletinAiReviewField[],
  acceptedSectionIds: string[],
): { draft: AiApplicableDraft; review: BulletinAiReview } {
  const accepted = new Set(acceptedFields);
  const sectionIds = new Set(acceptedSectionIds);
  const selectedSections = response.suggestion.sections
    .filter((section) => sectionIds.has(section.id))
    .map(({ id, heading, body }) => ({ id, heading, body }));

  return {
    draft: {
      title: accepted.has('title') ? response.suggestion.title.value : current.title,
      summary: accepted.has('summary') ? response.suggestion.summary.value : current.summary,
      category: accepted.has('category') ? response.suggestion.category.value : current.category,
      priority: accepted.has('priority') ? response.suggestion.priority.value : current.priority,
      sections: accepted.has('sections') && selectedSections.length > 0 ? selectedSections : current.sections,
    },
    review: {
      runId: response.runId,
      acceptedFields,
      acceptedSectionIds: accepted.has('sections') ? selectedSections.map((section) => section.id) : [],
    },
  };
}
