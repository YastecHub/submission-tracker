function isStudentPath(path: string): boolean {
  return path === '/student'
    || path.startsWith('/student/')
    || path === '/transparency'
    || path.startsWith('/payment/')
    || path.startsWith('/pay/');
}

/**
 * Where to send a student after signing in. Accepts any student page in this app
 * (Bulletin articles, tickets, payments, transparency) and rejects anything else,
 * including links to other sites.
 */
export function safeStudentReturnTo(requested: string | null | undefined, fallback = '/student'): string {
  if (!requested || !requested.startsWith('/') || requested.startsWith('//') || requested.includes('\\')) return fallback;
  try {
    const url = new URL(requested, 'https://nexium.invalid');
    if (url.origin !== 'https://nexium.invalid' || !isStudentPath(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
