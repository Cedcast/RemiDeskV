import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

const ProviderBadge = ({ provider }) => {
  const map = {
    stripe: 'bg-purple-100 text-purple-700',
    paypal: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[provider] || 'bg-gray-100 text-gray-600'}`}>
      {provider}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
    refunded: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: 20 };
      if (providerFilter) params.provider = providerFilter;
      if (statusFilter) params.status = statusFilter;
      const [paymentsRes, revenueRes] = await Promise.all([
        adminAPI.getPayments(params),
        adminAPI.getRevenue(),
      ]);
      setPayments(paymentsRes.data.items);
      setTotal(paymentsRes.data.total);
      setRevenue(revenueRes.data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, providerFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / 20);

  const chartData = revenue?.monthly_revenue?.map((m) => ({
    month: m.month.slice(5),
    revenue: m.count / 100,
  })) || [];

  const currencySummary = Object.entries(revenue?.total_by_currency || {}).map(
    ([currency, amount]) => ({ currency, amount: (amount / 100).toFixed(2) })
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Ledger</h2>
        <p className="text-sm text-gray-500 mt-1">{total} total payments</p>
      </div>

      {/* Revenue summary cards */}
      {currencySummary.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {currencySummary.map(({ currency, amount }) => (
            <div key={currency} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 uppercase">{currency} Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'CAD' ? 'C$' : 'A$'}{amount}
              </p>
              <p className="text-xs text-gray-400 mt-1">From completed payments</p>
            </div>
          ))}
        </div>
      )}

      {/* Monthly revenue chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly Revenue (USD)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
        <select
          value={providerFilter}
          onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Providers</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
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
                  {['Date', 'User', 'Amount', 'Provider', 'Status', 'Description'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.user_name}</p>
                      <p className="text-xs text-gray-400">{p.user_email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {p.currency} {(p.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3"><ProviderBadge provider={p.provider} /></td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{p.description || '—'}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">No payments found</td>
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

export default AdminPaymentsPage;
