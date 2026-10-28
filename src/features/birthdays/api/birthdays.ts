import api from '../../../api/axios';
import { studentAuthHeader } from '../../student-auth/api/studentAuth';
import type { BirthdayOverview, MyBirthday } from '../model/types';

export async function getMyBirthday(token: string, signal?: AbortSignal) {
  return (await api.get<MyBirthday>('/api/birthdays/me', { signal, headers: studentAuthHeader(token) })).data;
}

export async function saveMyBirthday(token: string, form: {
  month: number;
  day: number;
  preferredName: string;
  shareWithClass: boolean;
  photo: File | null;
  removePhoto: boolean;
}) {
  const body = new FormData();
  body.append('month', String(form.month));
  body.append('day', String(form.day));
  body.append('preferredName', form.preferredName);
  body.append('shareWithClass', String(form.shareWithClass));
  if (form.photo) body.append('photo', form.photo);
  else if (form.removePhoto) body.append('removePhoto', 'true');
  return (await api.put<MyBirthday>('/api/birthdays/me', body, { headers: studentAuthHeader(token), timeout: 60_000 })).data;
}

// ---- Class reps and developer ------------------------------------------------

export async function getBirthdayOverview(signal?: AbortSignal) {
  return (await api.get<BirthdayOverview>('/api/birthdays/admin', { signal })).data;
}

/** Downloads the Excel file for the media team. */
export async function downloadBirthdayExport() {
  const response = await api.get<Blob>('/api/birthdays/admin/export', { responseType: 'blob' });
  const match = String(response.headers['content-disposition'] ?? '').match(/filename="(.+)"/);
  const url = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = match?.[1] ?? 'nexium-birthdays.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
