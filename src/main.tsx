import React from 'react';
import { startServiceWorker } from './pwa/serviceWorker';

startServiceWorker();

import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import './index.css';

function RedirectWithSlug({ to }: { to: (slug: string) => string }) {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={to(slug ?? '')} replace />;
}

import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { StudentAuthProvider } from './context/StudentAuthContext';
import StudentProtectedRoute from './components/StudentProtectedRoute';
import StudentLoginPage from './pages/StudentLoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import EventDetail from './pages/EventDetail';
import ProfilePage from './pages/ProfilePage';
import SubmissionForm from './pages/SubmissionForm';
import SubmissionSuccess from './pages/SubmissionSuccess';
import SubmissionClosed from './pages/SubmissionClosed';
import PaymentSubmitForm from './pages/PaymentSubmitForm';
import PaymentSubmitSuccess from './pages/PaymentSubmitSuccess';
import PaymentSubmitClosed from './pages/PaymentSubmitClosed';
import PaymentMyTickets from './pages/PaymentMyTickets';
import PaymentEventDetail from './pages/PaymentEventDetail';
import TransparencyPage from './pages/TransparencyPage';
import InstallBanner from './components/InstallBanner';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';

const StudentShell = React.lazy(() => import('./features/bulletin/components/StudentShell'));
const StudentHomePage = React.lazy(() => import('./pages/StudentHomePage'));
const BulletinFeedPage = React.lazy(() => import('./pages/BulletinFeedPage'));
const BulletinArticlePage = React.lazy(() => import('./pages/BulletinArticlePage'));
const StudentTicketsPage = React.lazy(() => import('./pages/StudentTicketsPage'));
const GpaLayout = React.lazy(() => import('./pages/GpaLayout'));
const GpaOverviewPage = React.lazy(() => import('./pages/GpaOverviewPage'));
const GpaSemesterPage = React.lazy(() => import('./pages/GpaSemesterPage'));
const GpaTranscriptPage = React.lazy(() => import('./pages/GpaTranscriptPage'));
const BulletinManagementPage = React.lazy(() => import('./pages/BulletinManagementPage'));
const BulletinComposerPage = React.lazy(() => import('./pages/BulletinComposerPage'));

const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
const Analytics = React.lazy(() =>
  import('@vercel/analytics/react').then((mod) => ({ default: mod.Analytics }))
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <StudentAuthProvider><ToastProvider>
          <InstallBanner />
          <PwaUpdatePrompt />
          {enableAnalytics && (
            <React.Suspense fallback={null}>
              <Analytics />
            </React.Suspense>
          )}
          <React.Suspense fallback={<div className="page-base flex items-center justify-center"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[color:var(--nx-accent)]" /></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/student/login" element={<StudentLoginPage />} />
            <Route
              path="/student"
              element={<StudentProtectedRoute><StudentShell /></StudentProtectedRoute>}
            >
              <Route index element={<StudentHomePage />} />
              <Route path="news" element={<BulletinFeedPage />} />
              <Route path="news/:slug" element={<BulletinArticlePage />} />
              <Route path="tickets" element={<StudentTicketsPage />} />
              <Route path="gpa" element={<GpaLayout />}>
                <Route index element={<GpaOverviewPage />} />
                <Route path="semester/:id" element={<GpaSemesterPage />} />
              </Route>
            </Route>
            <Route
              path="/student/gpa/transcript"
              element={<StudentProtectedRoute><GpaLayout><GpaTranscriptPage /></GpaLayout></StudentProtectedRoute>}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/events/:id"
              element={
                <ProtectedRoute>
                  <EventDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/bulletin"
              element={<ProtectedRoute><BulletinManagementPage /></ProtectedRoute>}
            />
            <Route
              path="/dashboard/bulletin/new"
              element={<ProtectedRoute><BulletinComposerPage /></ProtectedRoute>}
            />
            <Route
              path="/dashboard/bulletin/:id"
              element={<ProtectedRoute><BulletinComposerPage /></ProtectedRoute>}
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/submitit/:slug" element={<SubmissionForm />} />
            <Route path="/submitit/:slug/success" element={<SubmissionSuccess />} />
            <Route path="/submitit/:slug/closed" element={<SubmissionClosed />} />
            <Route path="/payment/:slug" element={<StudentProtectedRoute><PaymentSubmitForm /></StudentProtectedRoute>} />
            <Route path="/payment/:slug/success" element={<StudentProtectedRoute><PaymentSubmitSuccess /></StudentProtectedRoute>} />
            <Route path="/payment/:slug/closed" element={<PaymentSubmitClosed />} />
            <Route path="/payment/:slug/my-tickets" element={<StudentProtectedRoute><PaymentMyTickets /></StudentProtectedRoute>} />
            <Route path="/submit/:slug" element={<RedirectWithSlug to={(s) => `/submitit/${s}`} />} />
            <Route path="/submit/:slug/success" element={<RedirectWithSlug to={(s) => `/submitit/${s}/success`} />} />
            <Route path="/submit/:slug/closed" element={<RedirectWithSlug to={(s) => `/submitit/${s}/closed`} />} />
            <Route path="/pay/:slug" element={<RedirectWithSlug to={(s) => `/payment/${s}`} />} />
            <Route path="/pay/:slug/success" element={<RedirectWithSlug to={(s) => `/payment/${s}/success`} />} />
            <Route path="/pay/:slug/closed" element={<RedirectWithSlug to={(s) => `/payment/${s}/closed`} />} />
            <Route path="/pay/:slug/my-tickets" element={<RedirectWithSlug to={(s) => `/payment/${s}/my-tickets`} />} />
            <Route path="/transparency" element={<StudentProtectedRoute><StudentShell><TransparencyPage /></StudentShell></StudentProtectedRoute>} />
            <Route
              path="/dashboard/payments/:id"
              element={
                <ProtectedRoute>
                  <PaymentEventDetail />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </React.Suspense>
        </ToastProvider></StudentAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
