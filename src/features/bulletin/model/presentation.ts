import type { AnnouncementCategory, AnnouncementPriority, AnnouncementSourceType } from './types';

export const categoryLabels: Record<AnnouncementCategory, string> = {
  general: 'General',
  academic: 'Academic',
  practical: 'Practical / Lab',
  finance: 'Finance',
  event: 'Event',
  opportunity: 'Opportunity',
  emergency: 'Emergency',
};

export const priorityLabels: Record<AnnouncementPriority, string> = {
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
};

export const sourceTypeLabels: Record<AnnouncementSourceType, string> = {
  official_class: 'Official class announcement',
  educational_contribution: 'Educational contribution',
  lecturer_information: 'Lecturer / faculty information',
  external_information: 'External information',
};

export function formatBulletinDate(value: string | null): string {
  if (!value) return 'Not published';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatBulletinDateTime(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
