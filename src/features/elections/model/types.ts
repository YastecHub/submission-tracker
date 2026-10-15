export type ElectionStatus = 'draft' | 'ready' | 'open' | 'paused' | 'closed' | 'published';

export interface Turnout {
  voted: number;
  eligible: number;
}

export interface StudentCandidate {
  id: string;
  displayName: string;
  nickname: string | null;
  photoUrl: string | null;
  manifesto: string | null;
}

export interface StudentPosition {
  id: string;
  title: string;
  unopposed: boolean;
  candidates: StudentCandidate[];
}

export interface StudentElection {
  id: string;
  title: string;
  description: string | null;
  isTest: boolean;
  status: ElectionStatus;
  opensAt: string;
  closesAt: string;
  publishedAt: string | null;
  serverTime: string;
  turnout: Turnout;
  me: { hasVoted: boolean; votedAt: string | null; blockedReason: string | null };
  positions: StudentPosition[];
}

export interface CandidateResult {
  candidateId: string;
  displayName: string;
  nickname: string | null;
  photoUrl: string | null;
  votes: number;
  percent: number;
  rank: number;
  isWinner: boolean;
}

export interface PositionResult {
  positionId: string;
  title: string;
  totalVotes: number;
  unopposed: boolean;
  yes?: number;
  no?: number;
  tie: boolean;
  candidates: CandidateResult[];
}

export interface ElectionResults {
  electionId: string;
  title: string;
  publishedAt?: string | null;
  positions: PositionResult[];
  turnout: Turnout & { percent: number; ballots?: number };
  integrity?: { ok: boolean; ballots: number; voters: number };
}

export interface BallotChoice {
  positionId: string;
  candidateId: string;
  approve?: boolean;
}

export interface AdminCandidate extends StudentCandidate {
  matricNumber: string | null;
  sortOrder: number;
}

export interface AdminPosition {
  id: string;
  title: string;
  sortOrder: number;
  candidates: AdminCandidate[];
}

export interface AdminElection {
  id: string;
  title: string;
  description: string | null;
  isTest: boolean;
  status: ElectionStatus;
  opensAt: string;
  closesAt: string;
  registrationDeadline: string | null;
  openedAt: string | null;
  closedAt: string | null;
  publishedAt: string | null;
  version: number;
  positions: AdminPosition[];
  counts: { voters: number; registered: number; voted: number; ballots: number };
  approvals: Array<{ userId: string; name: string; at: string }>;
  soloPublishAt: string | null;
  committee: Array<{ id: string; name: string }>;
  /** Newest first. */
  notifications: ElectionNotice[];
  /** When the committee can send the next reminder (null if none was sent). */
  reminderAvailableAt: string | null;
}

export interface ElectionNotice {
  kind: 'opened' | 'closing-60' | 'closing-15' | 'reminder' | 'results' | string;
  at: string;
  sentBy: string | null;
  pushQueued: number;
  emailsSent: number;
}

export interface AdminElectionSummary {
  id: string;
  title: string;
  isTest: boolean;
  status: ElectionStatus;
  effectiveStatus: ElectionStatus;
  opensAt: string;
  closesAt: string;
  publishedAt: string | null;
  counts: { positions: number; candidates: number; voters: number; voted: number };
}

export interface Registration {
  matricNumber: string;
  fullName: string;
  emailOnly: boolean;
  seededEmail: string | null;
  account: null | {
    id: string;
    name: string;
    email: string;
    registeredAt: string;
    suspended: boolean;
    suspendedReason: string | null;
  };
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  detail: Record<string, unknown> | null;
}

export interface LiveUpdate {
  electionId: string;
  status: ElectionStatus;
  opensAt: string;
  closesAt: string;
  publishedAt: string | null;
  voted: number;
  eligible: number;
}
