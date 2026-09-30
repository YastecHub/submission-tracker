// Cutoff timestamp separating 100 Level (previous academic session) from 200 Level (current session)
export const SESSION_200L_START = new Date('2026-09-30T12:00:00.000Z');

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
