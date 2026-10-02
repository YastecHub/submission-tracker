import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  deleteTransactionRequest,
} from '../api/transactions';
import TransactionFormModal from '../components/TransactionFormModal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import type { Transaction, TransactionType } from '../types';
import { useAdminLedger } from '../features/ledger/hooks/useAdminLedger';
import PreviousSessionArchive from '../components/PreviousSessionArchive';
import { is100LevelTransaction, getTransactionSessionLabel } from '../utils/session';

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

export default function DashboardLedger({ canManage = true }: { canManage?: boolean }) {
  const { toast } = useToast();
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

  const [show100lTransactions, setShow100lTransactions] = useState(false);

  const { data: ledger, loading, error, refresh: loadLedger } = useAdminLedger({
    page, limit: 30, type: typeFilter || undefined, search: debouncedSearch || undefined, includeDeleted,
  });
  useEffect(() => { if (error) toast('Failed to load ledger', 'error'); }, [error, toast]);

  const allTransactions = ledger ? ledger.transactions : [];
  const currentTransactions = allTransactions.filter((t) => !is100LevelTransaction(t));
  const archive100lTransactions = allTransactions.filter((t) => is100LevelTransaction(t));

  function renderTransactionCard(t: Transaction) {
    const isCredit = t.type === 'credit';
    const isAuto = !!t.receiptId;
    const sessionLabel = getTransactionSessionLabel(t);
    return (
      <div key={t.id} className={`card-base p-3.5 sm:p-4 ${t.isDeleted ? 'opacity-50' : ''}`}>
        <div className="flex gap-3 items-start">
          <div
            className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl bg-surface-2 border border-nx ${isCredit ? 'text-success' : 'text-danger'
              }`}
          >
            {isCredit ? '↓' : '↑'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-sm sm:text-base break-words">{t.description}</p>
                  <span className="badge font-mono text-[11px]">{sessionLabel}</span>
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
              <p className={`font-semibold text-sm sm:text-base whitespace-nowrap shrink-0 ${isCredit ? 'text-success' : 'text-danger'}`}>
                {isCredit ? '+' : '−'} {formatNaira(t.amount)}
              </p>
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs">
              {t.proofUrl && (
                <button
                  type="button"
                  onClick={() => setLightboxUrl(t.proofUrl!)}
                  className="text-accent hover:underline cursor-pointer"
                >
                  View proof
                </button>
              )}
              {canManage && !isAuto && !t.isDeleted && (
                <>
                  <button
                    type="button"
                    onClick={() => { setEditing(t); setFormOpen(true); }}
                    className="text-muted hover:text-[color:var(--nx-text)] hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(t)}
                    className="text-danger hover:underline cursor-pointer"
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
  }

  function handleSaved() {
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
              {ledger ? formatNairaShort(ledger.balance) : '-'}
            </p>
            {ledger && (
              <p className="text-xs text-dim mt-0.5">{formatNaira(ledger.balance)}</p>
            )}
          </div>
          {canManage && <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="btn-primary !py-2 !text-sm w-full sm:w-auto"
          >
            + New transaction
          </button>}
        </div>
        {ledger && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
            <div className="card-base bg-surface-2 p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-dim uppercase tracking-wider">Money in</p>
              <p className="text-sm sm:text-lg font-semibold text-success mt-1 break-words">{formatNairaShort(ledger.totalCredits)}</p>
            </div>
            <div className="card-base bg-surface-2 p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-dim uppercase tracking-wider">Money out</p>
              <p className="text-sm sm:text-lg font-semibold text-danger mt-1 break-words">{formatNairaShort(ledger.totalDebits)}</p>
            </div>
            <div className="card-base bg-surface-2 p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-dim uppercase tracking-wider">Entries</p>
              <p className="text-sm sm:text-lg font-semibold mt-1">{ledger.transactionCount}</p>
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
          className="input-base flex-1 min-w-0"
        />
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-start">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ''); setPage(1); }}
            className="input-base !w-auto !py-2 text-sm"
          >
            <option value="">All types</option>
            <option value="credit">Money in</option>
            <option value="debit">Money out</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-muted cursor-pointer select-none">
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
      ) : ledger && allTransactions.length === 0 ? (
        <div className="card-base p-16 text-center">
          <p className="font-semibold">{debouncedSearch ? 'No transactions match your search' : 'No transactions yet'}</p>
          <p className="text-sm text-muted mt-1">
            {debouncedSearch
              ? 'Try a different search term or clear the filter.'
              : canManage
                ? 'Click “+ New transaction” to record the first one.'
                : 'Transactions will appear here when they are recorded.'}
          </p>
        </div>
      ) : ledger ? (
        <>
          {/* 200 Level (Current Session) */}
          {currentTransactions.length === 0 ? (
            <div className="card-base p-8 text-center border-dashed border-nx mb-6">
              <div className="w-12 h-12 rounded-full bg-surface-2 border border-nx flex items-center justify-center mx-auto mb-3 text-xl">
                ⚖️
              </div>
              <h3 className="font-semibold text-lg">200 Level Transactions</h3>
              <p className="text-sm text-muted mt-1 max-w-md mx-auto">
                No 200 Level transactions recorded yet. Class dues, expenses, and records for this session will appear here.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => { setEditing(null); setFormOpen(true); }}
                  className="btn-primary mt-4"
                >
                  + Record 200L transaction
                </button>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    200 Level Transactions
                    <span className="badge badge-accent">Current Session</span>
                  </h2>
                  <p className="text-xs text-muted">Active financial entries and class expenses for 200L</p>
                </div>
                <span className="text-xs text-dim font-mono">{currentTransactions.length} active</span>
              </div>
              <div className="space-y-3">
                {currentTransactions.map(renderTransactionCard)}
              </div>
            </div>
          )}

          {/* 100 Level (Previous Session Archive) */}
          <PreviousSessionArchive
            title="100 Level Transactions"
            subtitle={`${archive100lTransactions.length} transaction${archive100lTransactions.length === 1 ? '' : 's'} preserved from last session`}
            levelLabel="100L"
            count={archive100lTransactions.length}
            isOpen={show100lTransactions || debouncedSearch.trim().length > 0}
            onToggle={() => setShow100lTransactions((prev) => !prev)}
          >
            <div className="space-y-3">
              {archive100lTransactions.map(renderTransactionCard)}
            </div>
          </PreviousSessionArchive>
        </>
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

      {canManage && formOpen && (
        <TransactionFormModal
          transaction={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {canManage && deleteTarget && (
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
