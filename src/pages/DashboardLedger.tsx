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
    loadLedger();
  }, [loadLedger]);

  function handleSaved(updated: Transaction) {
    if (editing) {
      setLedger((prev) =>
        prev
          ? { ...prev, transactions: prev.transactions.map((t) => (t.id === updated.id ? updated : t)) }
          : prev
      );
    }
    loadLedger();
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransactionRequest(deleteTarget.id);
      toast('Transaction deleted', 'success');
      setDeleteTarget(null);
      loadLedger();
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
  const balanceColor = balance >= 0 ? 'text-emerald-700' : 'text-red-700';

  return (
    <>
      {/* Balance card */}
      <div className="bg-white rounded-2xl shadow p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-gray-500">Class account balance</p>
            <p className={`text-3xl sm:text-4xl font-bold mt-1 ${balanceColor}`}>
              {ledger ? formatNaira(ledger.balance) : '—'}
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + New Transaction
          </button>
        </div>
        {ledger && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Money In</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatNaira(ledger.totalCredits)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Money Out</p>
              <p className="text-lg font-bold text-red-700 mt-0.5">{formatNaira(ledger.totalDebits)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Entries</p>
              <p className="text-lg font-bold text-gray-700 mt-0.5">{ledger.transactionCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search description or category..."
          className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ''); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All types</option>
          <option value="credit">Money in</option>
          <option value="debit">Money out</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 ml-1">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => { setIncludeDeleted(e.target.checked); setPage(1); }}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          Show deleted
        </label>
      </div>

      {/* Transactions list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : ledger && ledger.transactions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📒</p>
          <p className="font-medium">No transactions yet</p>
          <p className="text-sm mt-1">Click "+ New Transaction" to record the first one.</p>
        </div>
      ) : ledger ? (
        <div className="space-y-3">
          {ledger.transactions.map((t) => {
            const isCredit = t.type === 'credit';
            const isAuto = !!t.receiptId;
            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl shadow p-4 ${t.isDeleted ? 'opacity-50' : ''}`}
              >
                <div className="flex gap-3 items-start">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                      isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isCredit ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-gray-900">{t.description}</p>
                          {isAuto && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold uppercase">
                              Auto
                            </span>
                          )}
                          {t.isDeleted && (
                            <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full font-semibold uppercase">
                              Deleted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                          <span>{formatDate(t.occurredAt)}</span>
                          {t.category && (
                            <>
                              <span>·</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded-full">{t.category}</span>
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
                      <p className={`font-bold whitespace-nowrap ${isCredit ? 'text-emerald-700' : 'text-red-700'}`}>
                        {isCredit ? '+' : '−'} {formatNaira(t.amount)}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs">
                      {t.proofUrl && (
                        <button
                          onClick={() => setLightboxUrl(t.proofUrl!)}
                          className="text-emerald-700 hover:underline"
                        >
                          View proof
                        </button>
                      )}
                      {!isAuto && !t.isDeleted && (
                        <>
                          <button
                            onClick={() => { setEditing(t); setFormOpen(true); }}
                            className="text-gray-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            className="text-red-600 hover:underline"
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

      {/* Pagination */}
      {ledger && ledger.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            {page} / {ledger.totalPages}
          </span>
          <button
            disabled={page >= ledger.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <TransactionFormModal
          transaction={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Transaction"
          message={`Delete "${deleteTarget.description}"? It will be hidden from the transparency page but kept for audit.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Proof"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/40 rounded-full w-10 h-10 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
