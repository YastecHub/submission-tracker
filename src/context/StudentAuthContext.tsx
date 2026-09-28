import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getStudent, loginStudent, registerStudent, requestStudentRegistrationCode, type StudentAccount } from '../features/student-auth/api/studentAuth';
import axios from 'axios';

interface StudentAuthValue {
  student: StudentAccount | null;
  token: string | null;
  loading: boolean;
  sessionError: boolean;
  retrySession: () => void;
  login: (matricNumber: string, password: string) => Promise<void>;
  requestRegistrationCode: (matricNumber: string, email: string) => Promise<void>;
  register: (matricNumber: string, email: string, code: string, password: string) => Promise<void>;
  logout: () => void;
}

const StudentAuthContext = createContext<StudentAuthValue | null>(null);

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentAccount | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('studentToken'));
  const [loading, setLoading] = useState(Boolean(token));
  const [sessionError, setSessionError] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState(0);

  useEffect(() => {
    if (!token) { setLoading(false); setSessionError(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setSessionError(false);
    getStudent(token, controller.signal)
      .then(setStudent)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (localStorage.getItem('studentToken') === token) {
            localStorage.removeItem('studentToken'); setToken(null); setStudent(null);
          }
        } else {
          setSessionError(true);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, restoreVersion]);

  const applySession = useCallback((result: { token: string; student: StudentAccount }) => {
    localStorage.setItem('studentToken', result.token);
    setToken(result.token);
    setStudent(result.student);
    setSessionError(false);
  }, []);

  const login = useCallback(async (matricNumber: string, password: string) => { applySession(await loginStudent(matricNumber, password)); }, [applySession]);
  const requestRegistrationCode = useCallback(async (matricNumber: string, email: string) => { await requestStudentRegistrationCode(matricNumber, email); }, []);
  const register = useCallback(async (matricNumber: string, email: string, code: string, password: string) => { applySession(await registerStudent(matricNumber, email, code, password)); }, [applySession]);
  const logout = useCallback(() => { localStorage.removeItem('studentToken'); setToken(null); setStudent(null); }, []);
  const retrySession = useCallback(() => setRestoreVersion((value) => value + 1), []);
  const value = useMemo(() => ({ student, token, loading, sessionError, retrySession, login, requestRegistrationCode, register, logout }), [student, token, loading, sessionError, retrySession, login, requestRegistrationCode, register, logout]);

  return <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuth() {
  const value = useContext(StudentAuthContext);
  if (!value) throw new Error('useStudentAuth must be used inside StudentAuthProvider');
  return value;
}
