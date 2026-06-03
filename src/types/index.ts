export type EventType = 'assignment' | 'attendance' | 'lab' | 'other';
export type Level = '100L' | '200L' | '300L' | '400L' | '500L' | 'Postgrad';

export type UserRole = 'cr' | 'acr' | 'fin_sec' | 'dev';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
}

export interface SubmissionEvent {
  id: string;
  slug: string;
  title: string;
  courseCode: string;
  type: EventType;
  description?: string | null;
  deadline: string;
  isClosed: boolean;
  isDeleted: boolean;
  createdBy?: string;
  createdAt?: string;
  totalSubmissions?: number;
  confirmedCount?: number;
  pendingCount?: number;
}

export interface Submission {
  id: string;
  eventId: string;
  fullName: string;
  matricNumber: string;
  level?: string | null;
  qrCode: string;
  submittedAt: string;
  isConfirmed: boolean;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
}

export interface PaymentEvent {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  amount: string; // Decimal comes as string from JSON
  accountNumber: string;
  accountName: string;
  bankName: string;
  deadline: string;
  hasTickets: boolean;
  isClosed: boolean;
  isDeleted: boolean;
  createdBy?: string;
  createdAt?: string;
  totalReceipts?: number;
  confirmedCount?: number;
  rejectedCount?: number;
  pendingCount?: number;
}

export interface PaymentReceipt {
  id: string;
  eventId: string;
  fullName: string;
  matricNumber: string;
  level?: string | null;
  amountPaid?: string | null;
  receiptUrl: string;
  receiptPublicId: string;
  submittedAt: string;
  status: PaymentStatus;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  note?: string | null;
  ticketQrCode?: string | null;
  isClaimed?: boolean;
  claimedAt?: string | null;
  claimedBy?: string | null;
}

export type TransactionType = 'credit' | 'debit';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  description: string;
  category?: string | null;
  occurredAt: string;
  proofUrl?: string | null;
  recorderName?: string | null;
  recorderRole?: string | null;
  receiptId?: string | null;
  paymentEventId?: string | null;
  paymentEventTitle?: string | null;
  paymentEventSlug?: string | null;
  paymentEventReference?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  recordedBy?: string;
}

export interface PaymentEventTransactionGroup {
  paymentEventId: string;
  paymentEventTitle: string;
  paymentEventSlug: string;
  paymentEventReference: string;
  totalCollected: string;
  transactionCount: number;
  transactions: Transaction[];
}

export interface Ledger {
  balance: string;
  totalCredits: string;
  totalDebits: string;
  transactionCount: number;
  transactions: Transaction[];
  paymentEventGroups?: PaymentEventTransactionGroup[];
  ungroupedTransactions?: Transaction[];
  page: number;
  limit: number;
  totalPages: number;
}
