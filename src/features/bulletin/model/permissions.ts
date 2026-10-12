import type { UserRole } from '../../../types';
import { isClassRep } from '../../auth/model/capabilities';
import type { AnnouncementCategory, AnnouncementStatus } from './types';

interface ClassRepIdentity {
  id: string;
  role: UserRole;
}

interface ManagedAnnouncement {
  createdBy: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
}

/** Every class rep can publish and edit any category, including finance. */
export function canPublishAnnouncement(role: UserRole | undefined, _category: AnnouncementCategory): boolean {
  return isClassRep(role);
}

export function canEditAnnouncement(user: ClassRepIdentity | null | undefined, announcement: ManagedAnnouncement): boolean {
  if (!user || announcement.status === 'archived') return false;
  return isClassRep(user.role);
}
