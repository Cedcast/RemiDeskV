import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { CreditCardIcon, UserGroupIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const TierBadge = ({ tier }) => {
  const map = {
    premium: 'bg-amber-100 text-amber-700',
    pro: 'bg-purple-100 text-purple-700',
    free_trial: 'bg-green-100 text-green-700',
    trial_expired: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[tier] || 'bg-gray-100 text-gray-600'}`}>
      {tier}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    active: 'bg-green-100 text-green-700',
    trialing: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-600',
    expired: 'bg-red-100 text-red-700',
    past_due: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const StatCard = ({ title, value, subtitle, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
};

const AdminSubscriptionsPage = () => {
  const [summary, setSummary] = useState(null);
  const [subs, setSubs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: 20 };
      if (tierFilter) params.tier = tierFilter;
      if (statusFilter) params.status = statusFilter;
      const [summaryRes, subsRes] = await Promise.all([
        adminAPI.getSubscriptionSummary(),
        adminAPI.getSubscriptions(params),
      ]);
      setSummary(summaryRes.data);
      setSubs(subsRes.data.items);
      setTotal(subsRes.data.total);
    } catch {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page, tierFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / 20);
  const mrrUSD = summary?.total_mrr?.USD
    ? `$${(summary.total_mrr.USD / 100).toFixed(2)}`
    : '$0.00';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscriptions</h2>
        <p className="text-sm text-gray-500 mt-1">Platform-wide subscription overview</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Free Trial" value={summary.free_trial_count} color="green" />
          <StatCard title="Premium" value={summary.premium_count} color="amber" />
          <StatCard title="Pro" value={summary.pro_count} color="purple" />
          <StatCard title="Expired" value={summary.expired_count} color="red" />
          <StatCard title="MRR (USD)" value={mrrUSD} subtitle="Active paid only" color="indigo" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Tiers</option>
          <option value="free_trial">Free Trial</option>
          <option value="premium">Premium</option>
          <option value="pro">Pro</option>
          <option value="trial_expired">Trial Expired</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="past_due">Past Due</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['User', 'Email', 'Tier', 'Status', 'Currency', 'Period End', 'Created'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.user_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.user_email}</td>
                    <td className="px-4 py-3"><TierBadge tier={s.tier} /></td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-gray-600">{s.currency}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.current_period_end
                        ? new Date(s.current_period_end).toLocaleDateString()
                        : s.trial_ends_at
                        ? `Trial: ${new Date(s.trial_ends_at).toLocaleDateString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {subs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No subscriptions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50">Previous</button>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSubscriptionsPage;
