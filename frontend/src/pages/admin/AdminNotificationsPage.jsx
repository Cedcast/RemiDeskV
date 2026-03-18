import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

const CHANNEL_COLORS = {
  email: '#6366f1',
  sms: '#22c55e',
  whatsapp: '#25d366',
};

const ChannelBadge = ({ channel }) => {
  const map = {
    email: 'bg-indigo-100 text-indigo-700',
    sms: 'bg-green-100 text-green-700',
    whatsapp: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[channel] || 'bg-gray-100 text-gray-600'}`}>
      {channel}
    </span>
  );
};

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
    status === 'sent' ? 'bg-green-100 text-green-700' :
    status === 'failed' ? 'bg-red-100 text-red-700' :
    'bg-gray-100 text-gray-600'
  }`}>
    {status}
  </span>
);

const AdminNotificationsPage = () => {
  const [notifStats, setNotifStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: 20 };
      if (channelFilter) params.channel = channelFilter;
      if (statusFilter) params.status = statusFilter;
      const [statsRes, logsRes] = await Promise.all([
        adminAPI.getNotificationStats(),
        adminAPI.getNotifications(params),
      ]);
      setNotifStats(statsRes.data);
      setNotifications(logsRes.data.items);
      setTotal(logsRes.data.total);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page, channelFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / 20);

  const pieData = notifStats
    ? Object.entries(notifStats.by_channel).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notification Monitoring</h2>
        <p className="text-sm text-gray-500 mt-1">Platform-wide notification delivery stats</p>
      </div>

      {/* Stats Cards */}
      {notifStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Sent', value: notifStats.total_sent, color: 'text-green-600' },
            { label: 'Total Failed', value: notifStats.total_failed, color: 'text-red-600' },
            { label: 'Delivery Rate', value: `${notifStats.delivery_rate_percent}%`, color: parseFloat(notifStats.delivery_rate_percent) >= 90 ? 'text-green-600' : 'text-orange-600' },
            { label: 'Channels', value: Object.keys(notifStats.by_channel).join(', ') || '—', color: 'text-gray-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Channel breakdown chart */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Notifications by Channel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
        <select
          value={channelFilter}
          onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
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
                  {['Date', 'Appt ID', 'Channel', 'Type', 'Recipient', 'Status', 'Error'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <tr key={n.id} className={`hover:bg-gray-50 ${n.status === 'failed' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 text-gray-500">{new Date(n.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">#{n.appointment_id}</td>
                    <td className="px-4 py-3"><ChannelBadge channel={n.channel} /></td>
                    <td className="px-4 py-3 text-gray-600">{n.notification_type}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{n.recipient || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                    <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">{n.error_message || '—'}</td>
                  </tr>
                ))}
                {notifications.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No notifications found</td>
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

export default AdminNotificationsPage;
