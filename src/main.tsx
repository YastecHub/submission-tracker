import React from 'react';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import './index.css';

function RedirectWithSlug({ to }: { to: (slug: string) => string }) {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={to(slug ?? '')} replace />;
}

import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EventDetail from './pages/EventDetail';
import ProfilePage from './pages/ProfilePage';
import SubmissionForm from './pages/SubmissionForm';
import SubmissionSuccess from './pages/SubmissionSuccess';
import SubmissionClosed from './pages/SubmissionClosed';
import PaymentSubmitForm from './pages/PaymentSubmitForm';
import PaymentSubmitSuccess from './pages/PaymentSubmitSuccess';
import PaymentSubmitClosed from './pages/PaymentSubmitClosed';
import PaymentEventDetail from './pages/PaymentEventDetail';
import TransparencyPage from './pages/TransparencyPage';
import InstallBanner from './components/InstallBanner';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <InstallBanner />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
            <Route path="/payment/:slug" element={<PaymentSubmitForm />} />
            <Route path="/payment/:slug/success" element={<PaymentSubmitSuccess />} />
            <Route path="/payment/:slug/closed" element={<PaymentSubmitClosed />} />
            <Route path="/submit/:slug" element={<RedirectWithSlug to={(s) => `/submitit/${s}`} />} />
            <Route path="/submit/:slug/success" element={<RedirectWithSlug to={(s) => `/submitit/${s}/success`} />} />
            <Route path="/submit/:slug/closed" element={<RedirectWithSlug to={(s) => `/submitit/${s}/closed`} />} />
            <Route path="/pay/:slug" element={<RedirectWithSlug to={(s) => `/payment/${s}`} />} />
            <Route path="/pay/:slug/success" element={<RedirectWithSlug to={(s) => `/payment/${s}/success`} />} />
            <Route path="/pay/:slug/closed" element={<RedirectWithSlug to={(s) => `/payment/${s}/closed`} />} />
            <Route path="/transparency" element={<TransparencyPage />} />
            <Route
              path="/dashboard/payments/:id"
              element={
                <ProtectedRoute>
                  <PaymentEventDetail />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
