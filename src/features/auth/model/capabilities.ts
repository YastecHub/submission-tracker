import type { UserRole } from '../../../types';

/**
 * Class roles. CR, ACR, Fin Sec and Dev share the same rights everywhere;
 * the server enforces the same rule. Creating new class rep accounts is the
 * only developer-only action.
 */
export const CLASS_ROLES: readonly UserRole[] = ['cr', 'acr', 'fin_sec', 'dev'];

export function isClassRep(role: UserRole | string | undefined | null): role is UserRole {
  return !!role && (CLASS_ROLES as readonly string[]).includes(role);
}

export interface DashboardCapabilities {
  submissions: boolean;
  payments: boolean;
  ledger: boolean;
  createSubmissions: boolean;
  createPayments: boolean;
  manageLedger: boolean;
}

export function dashboardCapabilities(role: UserRole | undefined): DashboardCapabilities {
  const allowed = isClassRep(role);
  return {
    submissions: allowed,
    payments: allowed,
    ledger: allowed,
    createSubmissions: allowed,
    createPayments: allowed,
    manageLedger: allowed,
  };
}

export function canManageSubmissionEvent(role: UserRole | undefined, _userId?: string, _createdBy?: string): boolean {
  return isClassRep(role);
}

export function canManagePaymentEvent(role: UserRole | undefined, _userId?: string, _createdBy?: string): boolean {
  return isClassRep(role);
}
