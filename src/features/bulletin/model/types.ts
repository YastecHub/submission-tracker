import type { UserRole } from '../../../types';

export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementCategory = 'general' | 'academic' | 'practical' | 'finance' | 'event' | 'opportunity' | 'emergency';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type AnnouncementSourceType = 'official_class' | 'educational_contribution' | 'lecturer_information' | 'external_information';

export interface AnnouncementSection {
  id: string;
  heading: string | null;
  body: string;
}

export interface AnnouncementDocument {
  version: 1;
  sections: AnnouncementSection[];
}

export interface BulletinStaffSummary {
  id: string;
  name: string;
  role: UserRole;
}

export interface BulletinFeedItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  sourceType: AnnouncementSourceType;
  contributorName: string | null;
  contributorCredit: string | null;
  isPinned: boolean;
  requiresAcknowledgement: boolean;
  version: number;
  publishedAt: string;
  updatedAt: string;
  publisher: { name: string; role: UserRole } | null;
  isUnread: boolean;
  isAcknowledged: boolean;
}

export interface RelatedPayment {
  slug: string;
  title: string;
  amount: string;
  deadline: string;
  hasTickets: boolean;
  isClosed: boolean;
  isDeleted?: boolean;
}

export interface BulletinArticle extends BulletinFeedItem {
  content: AnnouncementDocument;
  paymentEvent: RelatedPayment | null;
}

export interface BulletinFeedResponse {
  announcements: BulletinFeedItem[];
  page: number;
  total: number;
  totalPages: number;
}

export interface BulletinRevision {
  id: string;
  version: number;
  changeNote: string | null;
  origin: string;
  createdAt: string;
  creator: BulletinStaffSummary;
}

export interface AdminAnnouncement {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: AnnouncementDocument;
  rawSource: string | null;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  sourceType: AnnouncementSourceType;
  contributorName: string | null;
  contributorCredit: string | null;
  isPinned: boolean;
  requiresAcknowledgement: boolean;
  paymentEventId: string | null;
  paymentEvent: (RelatedPayment & { id: string }) | null;
  version: number;
  createdBy: string;
  updatedBy: string;
  publishedBy: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator: BulletinStaffSummary;
  updater: BulletinStaffSummary;
  publisher: BulletinStaffSummary | null;
  revisions: BulletinRevision[];
  readCount?: number;
}

export interface AdminAnnouncementListItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  isPinned: boolean;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
  creator: BulletinStaffSummary;
  updater: BulletinStaffSummary;
  readCount: number;
}

export interface AdminAnnouncementListResponse {
  announcements: AdminAnnouncementListItem[];
  page: number;
  total: number;
  totalPages: number;
}

export interface PaymentOption {
  id: string;
  slug: string;
  title: string;
  amount: string;
  deadline: string;
  isClosed: boolean;
}

export interface AnnouncementWriteInput {
  title: string;
  summary: string;
  content: AnnouncementDocument;
  rawSource: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  sourceType: AnnouncementSourceType;
  contributorName: string;
  contributorCredit: string;
  isPinned: boolean;
  paymentEventId: string;
  expectedVersion?: number;
  changeNote?: string;
  aiReview?: BulletinAiReview;
}

export type BulletinAiReviewField = 'title' | 'summary' | 'category' | 'priority' | 'sections';

export interface BulletinAiReview {
  runId: string;
  acceptedFields: BulletinAiReviewField[];
  acceptedSectionIds: string[];
}

export interface AiSuggestedText {
  value: string;
  sourceQuotes: string[];
}

export interface AiSuggestedSection extends AnnouncementSection {
  sourceQuotes: string[];
}

export interface BulletinAiOrganizationResponse {
  runId: string;
  suggestion: {
    title: AiSuggestedText;
    summary: AiSuggestedText;
    category: { value: AnnouncementCategory; reason: string };
    priority: { value: AnnouncementPriority; reason: string };
    sections: AiSuggestedSection[];
    warnings: Array<{
      code: 'missing_detail' | 'ambiguous_detail' | 'conflicting_detail' | 'verify_wording' | 'possible_multiple_announcements' | 'human_review_required';
      message: string;
      sourceQuote: string | null;
    }>;
    splitSuggestions: Array<{ title: string; reason: string; sourceQuote: string }>;
  };
  audit: {
    provider: string;
    model: string;
    promptVersion: string;
    createdAt: string;
  };
}
