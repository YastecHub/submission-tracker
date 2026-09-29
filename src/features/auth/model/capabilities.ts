import type { UserRole } from '../../../types';

export interface DashboardCapabilities {
  submissions: boolean;
  payments: boolean;
  ledger: boolean;
  createSubmissions: boolean;
  createPayments: boolean;
  manageLedger: boolean;
}

/**
 * All exco roles share equal dashboard access.
 * Only creating new exco accounts is dev-only (handled in auth).
 */
export function dashboardCapabilities(role: UserRole | undefined): DashboardCapabilities {
  const isStaff = role !== undefined;
  return {
    submissions: isStaff,
    payments: isStaff,
    ledger: isStaff,
    createSubmissions: isStaff,
    createPayments: isStaff,
    manageLedger: isStaff,
  };
}

export function canManageSubmissionEvent(role: UserRole | undefined, _userId?: string, _createdBy?: string): boolean {
  return role !== undefined;
}

export function canManagePaymentEvent(role: UserRole | undefined, _userId?: string, _createdBy?: string): boolean {
  return role !== undefined;
}
