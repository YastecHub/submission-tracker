import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { User } from '../types';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setProfileError('');
    if (!name.trim() || !email.trim()) {
      setProfileError('Name and email are required.');
      return;
    }
    setProfileLoading(true);
    try {
      const res = await api.patch<User>('/api/auth/profile', { name: name.trim(), email: email.trim() });
      setUser(res.data);
      toast('Profile updated!', 'success');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setProfileError(err.response?.data?.error ?? 'Failed to update profile.');
      } else {
        setProfileError('Failed to update profile.');
      }
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.patch('/api/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast('Password changed successfully!', 'success');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setPasswordError(err.response?.data?.error ?? 'Failed to change password.');
      } else {
        setPasswordError('Failed to change password.');
      }
    } finally {
      setPasswordLoading(false);
    }
  }

  const roleLabel =
    user?.role === 'acr' ? 'Assistant Class Rep' :
    user?.role === 'dev' ? 'Developer' :
    user?.role === 'fin_sec' ? 'Financial Secretary' :
    'Class Representative';

  return (
    <div className="page-base">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-ghost !px-0 mb-6"
        >
          ← Back to dashboard
        </button>

        <h1 className="text-2xl font-semibold tracking-tight mb-6">My profile</h1>

        <div className="card-base p-6 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-surface-2 border border-nx flex items-center justify-center text-xl font-semibold shrink-0">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <p className="text-sm text-muted">{user?.email}</p>
            <span className="badge badge-accent mt-2">{roleLabel}</span>
          </div>
        </div>

        <div className="card-base p-6 mb-5">
          <h2 className="text-base font-semibold mb-4">Update information</h2>
          {profileError && <div className="alert-danger mb-4">{profileError}</div>}
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-base"
              />
            </div>
            <button type="submit" disabled={profileLoading} className="btn-primary">
              {profileLoading ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        <div className="card-base p-6">
          <h2 className="text-base font-semibold mb-4">Change password</h2>
          {passwordError && <div className="alert-danger mb-4">{passwordError}</div>}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="input-base"
              />
            </div>
            <button type="submit" disabled={passwordLoading} className="btn-primary">
              {passwordLoading ? 'Changing…' : 'Change password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
