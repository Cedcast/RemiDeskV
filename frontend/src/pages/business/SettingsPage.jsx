import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI } from '../../services/api';
import BusinessManagePage from './BusinessManagePage';
import { UserCircleIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const previousEmail = user?.email;
    try {
      await userAPI.updateProfile({ full_name: fullName, email });
      await refreshUser();
      if (previousEmail && previousEmail !== email) {
        toast.success('Profile updated. Please check your new email to verify your account.');
      } else {
        toast.success('Profile updated.');
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Could not update profile.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const verified = user?.is_verified;

  return (
    <div className="py-8">
      {/* Account section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" id="account">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <UserCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
              <p className="text-sm text-gray-500">Update your profile details and contact email.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
            {verified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircleIcon className="h-4 w-4" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                <ExclamationTriangleIcon className="h-4 w-4" /> Verification required
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <p className="font-medium text-gray-700 mb-1">Role</p>
                <p className="capitalize">{user?.role || '\\u2014'}</p>
              </div>
              <div className="sm:text-right text-xs text-gray-500 flex sm:justify-end items-center">
                <p>
                  To change your password, use the <span className="font-medium">"Forgot password"</span>{' '}
                  link on the login page.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-dashed border-gray-200 mt-2">
              <p className="text-xs text-gray-500">
                Changing your email will sign it up for a new verification link.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Consolidated business + services manager */}
      <div id="business" className="mt-10">
        <BusinessManagePage />
      </div>
    </div>
  );
};

export default SettingsPage;
