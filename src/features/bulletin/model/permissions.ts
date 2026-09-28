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

export function canPublishAnnouncement(role: UserRole | undefined, category: AnnouncementCategory): boolean {
  if (role === 'dev') return true;
  if (category === 'finance') return role === 'fin_sec';
  return role === 'cr';
}

export function canEditAnnouncement(user: StaffIdentity | null | undefined, announcement: ManagedAnnouncement): boolean {
  if (!user || announcement.status === 'archived') return false;
  if (announcement.status !== 'draft') return canPublishAnnouncement(user.role, announcement.category);
  if (user.role === 'dev' || user.role === 'cr') return true;
  if (user.role === 'fin_sec' && announcement.category === 'finance') return true;
  return announcement.createdBy === user.id;
}
