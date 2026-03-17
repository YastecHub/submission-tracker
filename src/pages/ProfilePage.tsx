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

  const roleLabel = user?.role === 'acr' ? 'Assistant Class Rep' : 'Class Representative';
  const roleBadgeClass = user?.role === 'acr'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-blue-600 hover:underline mb-6 inline-block"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Avatar + role */}
        <div className="bg-white rounded-2xl shadow p-6 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass}`}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Profile info form */}
        <div className="bg-white rounded-2xl shadow p-6 mb-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Update Information</h2>
          {profileError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {profileError}
            </div>
          )}
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={profileLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition disabled:opacity-60 text-base"
            >
              {profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change password form */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Change Password</h2>
          {passwordError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {passwordError}
            </div>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white font-semibold px-6 py-3 rounded-lg transition disabled:opacity-60 text-base"
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
