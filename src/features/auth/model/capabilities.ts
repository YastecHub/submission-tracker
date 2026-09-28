import type { UserRole } from '../../../types';

export interface DashboardCapabilities {
  submissions: boolean;
  payments: boolean;
  ledger: boolean;
  createSubmissions: boolean;
  createPayments: boolean;
  manageLedger: boolean;
}

export function dashboardCapabilities(role: UserRole | undefined): DashboardCapabilities {
  const isStaff = role !== undefined;
  return {
    submissions: isStaff,
    payments: isStaff,
    ledger: isStaff,
    createSubmissions: role === 'cr' || role === 'acr' || role === 'dev',
    createPayments: role === 'cr' || role === 'fin_sec' || role === 'dev',
    manageLedger: role === 'fin_sec' || role === 'dev',
  };
}

export function canManageSubmissionEvent(role: UserRole | undefined, userId: string | undefined, createdBy: string | undefined): boolean {
  return role === 'dev' || ((role === 'cr' || role === 'acr') && Boolean(userId && createdBy && userId === createdBy));
}

export function canManagePaymentEvent(role: UserRole | undefined, userId: string | undefined, createdBy: string | undefined): boolean {
  return role === 'dev' || role === 'fin_sec' || (role === 'cr' && Boolean(userId && createdBy && userId === createdBy));
}
