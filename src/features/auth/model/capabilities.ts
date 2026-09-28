import type { UserRole } from '../../../types';

export interface DashboardCapabilities {
  submissions: boolean;
  payments: boolean;
  ledger: boolean;
}

export function dashboardCapabilities(role: UserRole | undefined): DashboardCapabilities {
  return {
    submissions: role === 'cr' || role === 'acr' || role === 'dev',
    payments: role === 'cr' || role === 'fin_sec' || role === 'dev',
    ledger: role === 'fin_sec' || role === 'dev',
  };
}
