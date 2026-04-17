import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  fetchAdminTransactions,
  deleteTransactionRequest,
} from '../api/transactions';
import TransactionFormModal from '../components/TransactionFormModal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import type { Ledger, Transaction, TransactionType } from '../types';

function formatNaira(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `₦${amount}`;
  return n.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });
}

function formatNairaShort(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `₦${amount}`;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}₦${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    return `${sign}₦${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`;
  }
  return `${sign}₦${abs.toFixed(0)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DashboardLedger() {
  const { toast } = useToast();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminTransactions({
        page,
        limit: 30,
        type: typeFilter || undefined,
        search: debouncedSearch || undefined,
        includeDeleted,
      });
      setLedger(data);
    } catch {
      toast('Failed to load ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, debouncedSearch, includeDeleted, toast]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  function handleSaved(updated: Transaction) {
    if (editing) {
      setLedger((prev) =>
        prev
          ? { ...prev, transactions: prev.transactions.map((t) => (t.id === updated.id ? updated : t)) }
          : prev
      );
    }
    void loadLedger();
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransactionRequest(deleteTarget.id);
      toast('Transaction deleted', 'success');
      setDeleteTarget(null);
      void loadLedger();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast(err.response?.data?.error ?? 'Failed to delete', 'error');
      } else {
        toast('Failed to delete', 'error');
      }
    } finally {
      setDeleting(false);
    }
  }

  const balance = ledger ? Number(ledger.balance) : 0;
  const balanceClass = balance >= 0 ? 'text-success' : 'text-danger';

  return (
    <>
      <div className="card-base p-4 sm:p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">Class account balance</p>
            <p className={`text-3xl sm:text-4xl font-semibold tracking-tight mt-1 break-words ${balanceClass}`}>
              {ledger ? formatNairaShort(ledger.balance) : '—'}
            </p>
            {ledger && (
              <p className="text-xs text-dim mt-0.5">{formatNaira(ledger.balance)}</p>
            )}
          </div>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="btn-primary !py-2 !text-sm w-full sm:w-auto"
          >
            + New transaction
          </button>
        </div>
        {ledger && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
            <div className="card-base bg-surface-2 p-3 text-center">
              <p className="text-xs text-dim uppercase tracking-wider">Money in</p>
              <p className="text-base sm:text-lg font-semibold text-success mt-1 break-words">{formatNairaShort(ledger.totalCredits)}</p>
            </div>
            <div className="card-base bg-surface-2 p-3 text-center">
              <p className="text-xs text-dim uppercase tracking-wider">Money out</p>
              <p className="text-base sm:text-lg font-semibold text-danger mt-1 break-words">{formatNairaShort(ledger.totalDebits)}</p>
            </div>
            <div className="card-base bg-surface-2 p-3 text-center">
              <p className="text-xs text-dim uppercase tracking-wider">Entries</p>
              <p className="text-base sm:text-lg font-semibold mt-1">{ledger.transactionCount}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search description or category…"
          className="input-base flex-1 sm:min-w-[180px]"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ''); setPage(1); }}
            className="input-base !w-auto"
          >
            <option value="">All types</option>
            <option value="credit">Money in</option>
            <option value="debit">Money out</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => { setIncludeDeleted(e.target.checked); setPage(1); }}
              className="accent-[color:var(--nx-accent)]"
            />
            Show deleted
          </label>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-base p-4 animate-pulse">
              <div className="h-4 bg-surface-2 rounded w-1/3 mb-2" />
              <div className="h-3 bg-surface-2 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : ledger && ledger.transactions.length === 0 ? (
        <div className="card-base p-16 text-center">
          <p className="font-semibold">No transactions yet</p>
          <p className="text-sm text-muted mt-1">Click &ldquo;+ New transaction&rdquo; to record the first one.</p>
        </div>
      ) : ledger ? (
        <div className="space-y-3">
          {ledger.transactions.map((t) => {
            const isCredit = t.type === 'credit';
            const isAuto = !!t.receiptId;
            return (
              <div key={t.id} className={`card-base p-4 ${t.isDeleted ? 'opacity-50' : ''}`}>
                <div className="flex gap-3 items-start">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl bg-surface-2 border border-nx ${
                      isCredit ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {isCredit ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold">{t.description}</p>
                          {isAuto && <span className="badge badge-accent">Auto</span>}
                          {t.isDeleted && <span className="badge badge-danger">Deleted</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-dim flex-wrap">
                          <span>{formatDate(t.occurredAt)}</span>
                          {t.category && (
                            <>
                              <span>·</span>
                              <span className="bg-surface-2 border border-nx px-2 py-0.5 rounded-full">
                                {t.category}
                              </span>
                            </>
                          )}
                          {t.recorderName && (
                            <>
                              <span>·</span>
                              <span>by {t.recorderName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <p className={`font-semibold whitespace-nowrap ${isCredit ? 'text-success' : 'text-danger'}`}>
                        {isCredit ? '+' : '−'} {formatNaira(t.amount)}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs">
                      {t.proofUrl && (
                        <button
                          onClick={() => setLightboxUrl(t.proofUrl!)}
                          className="text-accent hover:underline"
                        >
                          View proof
                        </button>
                      )}
                      {!isAuto && !t.isDeleted && (
                        <>
                          <button
                            onClick={() => { setEditing(t); setFormOpen(true); }}
                            className="text-muted hover:text-[color:var(--nx-text)] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            className="text-danger hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {ledger && ledger.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-secondary !py-2 !text-sm"
          >
            ← Previous
          </button>
          <span className="px-4 py-2 text-sm text-muted">
            {page} / {ledger.totalPages}
          </span>
          <button
            disabled={page >= ledger.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary !py-2 !text-sm"
          >
            Next →
          </button>
        </div>
      )}

      {formOpen && (
        <TransactionFormModal
          transaction={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete transaction"
          message={`Delete "${deleteTarget.description}"? It will be hidden from the transparency page but kept for audit.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Proof"
            className="max-w-full max-h-full rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
