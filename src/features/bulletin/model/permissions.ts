import type { UserRole } from '../../../types';
import type { AnnouncementCategory, AnnouncementStatus } from './types';

interface StaffIdentity {
  id: string;
  role: UserRole;
}

interface ManagedAnnouncement {
  createdBy: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
}

/**
 * Roles that can manage any category including finance.
 * Only restriction: dev cannot create other excos (handled in auth controller).
 */
const MANAGE_ANY_CATEGORY: UserRole[] = ['dev', 'cr', 'acr'];

export function canPublishAnnouncement(role: UserRole | undefined, category: AnnouncementCategory): boolean {
  if (!role) return false;
  if (MANAGE_ANY_CATEGORY.includes(role)) return true;
  // fin_sec can only publish finance
  if (category === 'finance') return role === 'fin_sec';
  return false;
}

export function canEditAnnouncement(user: StaffIdentity | null | undefined, announcement: ManagedAnnouncement): boolean {
  if (!user || announcement.status === 'archived') return false;
  if (announcement.status !== 'draft') {
    // Published/archived: need publish permission for the category
    return canPublishAnnouncement(user.role, announcement.category);
  }
  // Draft: creator can edit, or any role that can manage any category
  if (MANAGE_ANY_CATEGORY.includes(user.role)) return true;
  // fin_sec can only edit their own finance drafts
  if (user.role === 'fin_sec' && announcement.category === 'finance') {
    return announcement.createdBy === user.id;
  }
  return announcement.createdBy === user.id;
}
