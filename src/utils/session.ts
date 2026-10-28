// Cutoff timestamp separating 100 Level (previous academic session) from 200 Level (current session)
export const SESSION_200L_START = new Date('2026-09-30T12:00:00.000Z');

/** The class's current level: forms pre-select it (students can still change it). Update each new session. */
export const CURRENT_CLASS_LEVEL = '200L' as const;

/**
 * Determines whether a submission or payment event belongs to the 100 Level academic session.
 * All records created before the 200L launch date are classified as 100L.
 */
export function is100LevelEvent(event: { createdAt?: string; deadline?: string }): boolean {
  if (event.createdAt) {
    return new Date(event.createdAt) < SESSION_200L_START;
  }
  if (event.deadline) {
    return new Date(event.deadline) < SESSION_200L_START;
  }
  return true;
}

export function getEventSessionLabel(event: { createdAt?: string; deadline?: string }): '100L' | '200L' {
  return is100LevelEvent(event) ? '100L' : '200L';
}

export function is100LevelTransaction(tx: { occurredAt?: string; createdAt?: string }): boolean {
  if (tx.occurredAt) {
    return new Date(tx.occurredAt) < SESSION_200L_START;
  }
  if (tx.createdAt) {
    return new Date(tx.createdAt) < SESSION_200L_START;
  }
  return true;
}

export function getTransactionSessionLabel(tx: { occurredAt?: string; createdAt?: string }): '100L' | '200L' {
  return is100LevelTransaction(tx) ? '100L' : '200L';
}
