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
const STAFF_ROLES: UserRole[] = ['dev', 'cr', 'acr', 'fin_sec'];

export function canPublishAnnouncement(role: UserRole | undefined, _category: AnnouncementCategory): boolean {
  if (!role) return false;
  return STAFF_ROLES.includes(role);
}

export function canEditAnnouncement(user: StaffIdentity | null | undefined, announcement: ManagedAnnouncement): boolean {
  if (!user || announcement.status === 'archived') return false;
  return STAFF_ROLES.includes(user.role);
}
