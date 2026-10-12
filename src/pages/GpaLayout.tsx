import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { GpaProvider } from '../features/gpa/hooks/GpaProvider';

/** Shares one GPA record (and its offline drafts) between the GPA pages. */
export default function GpaLayout({ children }: { children?: ReactNode }) {
  return <GpaProvider>{children ?? <Outlet />}</GpaProvider>;
}
