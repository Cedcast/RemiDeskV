import { useAuth } from '../../contexts/AuthContext';

const SettingsPage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Manage your personal account details used to access RemiDesk.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Full name
          </p>
          <p className="text-sm text-gray-900">{user?.full_name || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Email address
          </p>
          <p className="text-sm text-gray-900">{user?.email || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Role
          </p>
          <p className="text-sm text-gray-900 capitalize">{user?.role || '—'}</p>
        </div>
        <div className="pt-4 border-t border-dashed border-gray-200 mt-2">
          <p className="text-xs text-gray-500">
            To change your password, use the "Forgot password" link on the login page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
