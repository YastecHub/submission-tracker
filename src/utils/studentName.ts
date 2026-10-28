/**
 * The first name to greet a student by. Class-list names are "SURNAME, Firstname Middle",
 * so the first word after the comma is the first name; other names use their first word.
 */
export function studentFirstName(fullName: string | null | undefined, fallback = 'Student'): string {
  if (!fullName?.trim()) return fallback;
  const name = fullName.includes(',') ? fullName.split(',')[1] : fullName;
  return name.trim().split(/\s+/)[0] || fallback;
}
