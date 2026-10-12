/**
 * Source length the announcement assistant accepts. Must match
 * AI_SOURCE_MIN_LENGTH / AI_SOURCE_MAX_LENGTH in the server's announcementAiService.ts.
 * Longer source material can still be saved; only the assistant is limited.
 */
export const AI_SOURCE_MIN_LENGTH = 20;
export const AI_SOURCE_MAX_LENGTH = 5_000;

export function aiSourceStatus(rawSource: string): 'too-short' | 'ok' | 'too-long' {
  const length = rawSource.trim().length;
  if (length < AI_SOURCE_MIN_LENGTH) return 'too-short';
  if (length > AI_SOURCE_MAX_LENGTH) return 'too-long';
  return 'ok';
}
