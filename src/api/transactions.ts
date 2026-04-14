import api from './axios';
import type { Ledger, Transaction, TransactionType } from '../types';

export interface LedgerQuery {
  page?: number;
  limit?: number;
  type?: TransactionType;
  category?: string;
}

export async function fetchPublicLedger(params: LedgerQuery = {}): Promise<Ledger> {
  const { data } = await api.get<Ledger>('/api/transparency/ledger', { params });
  return data;
}

export async function verifyMatricNumber(
  matricNumber: string
): Promise<{ verified: boolean; displayName?: string; matricNumber?: string }> {
  const { data } = await api.post('/api/transparency/verify-matric', { matricNumber });
  return data;
}

export interface AdminLedgerQuery extends LedgerQuery {
  includeDeleted?: boolean;
  search?: string;
}

export async function fetchAdminTransactions(params: AdminLedgerQuery = {}): Promise<Ledger> {
  const { data } = await api.get<Ledger>('/api/transactions', { params });
  return data;
}

export interface TransactionPayload {
  type: TransactionType;
  amount: string;
  description: string;
  category?: string;
  occurredAt: string;
  proof?: File | null;
  removeProof?: boolean;
}

function toFormData(payload: TransactionPayload): FormData {
  const fd = new FormData();
  fd.append('type', payload.type);
  fd.append('amount', payload.amount);
  fd.append('description', payload.description);
  if (payload.category) fd.append('category', payload.category);
  fd.append('occurredAt', payload.occurredAt);
  if (payload.proof) fd.append('proof', payload.proof);
  if (payload.removeProof) fd.append('removeProof', 'true');
  return fd;
}

export async function createTransactionRequest(payload: TransactionPayload): Promise<Transaction> {
  const { data } = await api.post<Transaction>('/api/transactions', toFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateTransactionRequest(
  id: string,
  payload: TransactionPayload
): Promise<Transaction> {
  const { data } = await api.patch<Transaction>(`/api/transactions/${id}`, toFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteTransactionRequest(id: string): Promise<void> {
  await api.delete(`/api/transactions/${id}`);
}
