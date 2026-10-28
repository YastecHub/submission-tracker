export interface MyBirthday {
  birthday: null | {
    month: number;
    day: number;
    label: string;
    preferredName: string | null;
    shareWithClass: boolean;
    photoUrl: string | null;
    updatedAt: string;
  };
  isMyBirthday: boolean;
  greetingName: string;
  /** Classmates celebrating today who agreed to share it. */
  today: Array<{ name: string; photoUrl: string | null }>;
}

export interface BirthdayRow {
  fullName: string;
  preferredName: string | null;
  displayName: string;
  matricNumber: string;
  email: string;
  month: number;
  day: number;
  birthday: string;
  daysUntil: number;
  shareWithClass: boolean;
  photoUrl: string | null;
  submittedAt: string;
}

export interface BirthdayOverview {
  counts: { answered: number; students: number };
  upcoming: BirthdayRow[];
  rows: BirthdayRow[];
  notAnswered: Array<{ fullName: string; matricNumber: string }>;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Days per month, with 29 for February so leap-day birthdays can be chosen. */
export const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
