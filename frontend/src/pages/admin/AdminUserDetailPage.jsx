import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { ArrowLeftIcon, ShieldExclamationIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminUserDetailPage = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUser(id);
      setUser(res.data);
    } catch {
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [id]);

  const handleBan = async () => {
    if (!window.confirm(`Ban ${user.email}?`)) return;
    try {
      await adminAPI.banUser(user.id, { reason: 'Admin action' });
      toast.success('User banned');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const handleUnban = async () => {
    try {
      await adminAPI.unbanUser(user.id);
      toast.success('User unbanned');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) return <p className="text-gray-500">User not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/users" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">User Info</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['ID', user.id],
              ['Role', user.role],
              ['Phone', user.phone || '—'],
              ['Verified', user.is_verified ? 'Yes' : 'No'],
              ['Joined', new Date(user.created_at).toLocaleDateString()],
              ['Subscription', user.subscription_tier || '—'],
              ['Sub Status', user.subscription_status || '—'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{val}</dd>
              </div>
            ))}
          </dl>

          <div className="pt-3 border-t border-gray-100">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {user.is_active ? 'Active' : 'Banned'}
            </span>
            {user.suspension_reason && (
              <p className="text-xs text-red-600 mt-2">Reason: {user.suspension_reason}</p>
            )}
          </div>

          <div className="pt-2">
            {user.is_active ? (
              <button
                onClick={handleBan}
                className="flex items-center gap-2 w-full justify-center px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <ShieldExclamationIcon className="h-4 w-4" />
                Ban User
              </button>
            ) : (
              <button
                onClick={handleUnban}
                className="flex items-center gap-2 w-full justify-center px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <ShieldCheckIcon className="h-4 w-4" />
                Unban User
              </button>
            )}
          </div>
        </div>

        {/* Businesses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Businesses ({user.businesses?.length ?? 0})
          </h3>
          {user.businesses?.length > 0 ? (
            <div className="space-y-3">
              {user.businesses.map((b) => (
                <Link
                  key={b.id}
                  to={`/admin/businesses/${b.id}`}
                  className="block p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <p className="font-medium text-gray-900 text-sm">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.city}, {b.country}</p>
                  <span className={`text-xs ${b.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No businesses</p>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Payments</h3>
          {user.recent_payments?.length > 0 ? (
            <div className="space-y-2">
              {user.recent_payments.map((p) => (
                <div key={p.id} className="flex justify-between items-start text-sm p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">
                      {p.currency} {(p.amount / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{p.provider} · {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.status === 'completed' ? 'bg-green-100 text-green-700' :
                    p.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No payments</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetailPage;
