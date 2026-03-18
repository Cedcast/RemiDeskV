import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  user_banned: 'bg-red-100 text-red-700',
  user_unbanned: 'bg-green-100 text-green-700',
  business_suspended: 'bg-orange-100 text-orange-700',
  business_reinstated: 'bg-blue-100 text-blue-700',
  business_deleted: 'bg-red-100 text-red-700',
  business_updated: 'bg-indigo-100 text-indigo-700',
};

const ActionBadge = ({ action }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[action] || 'bg-gray-100 text-gray-700'}`}>
    {action.replace(/_/g, ' ')}
  </span>
);

const TargetBadge = ({ targetType }) => (
  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
    {targetType}
  </span>
);

const AdminAuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: 20 };
      if (actionFilter) params.action = actionFilter;
      if (targetTypeFilter) params.target_type = targetTypeFilter;
      const res = await adminAPI.getAuditLog(params);
      setLogs(res.data.items);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, targetTypeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / 20);

  const formatDetails = (details) => {
    if (!details) return '—';
    try {
      const parsed = JSON.parse(details);
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    } catch {
      return details;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardDocumentListIcon className="h-7 w-7 text-indigo-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} total entries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Actions</option>
          <option value="user_banned">User Banned</option>
          <option value="user_unbanned">User Unbanned</option>
          <option value="business_suspended">Business Suspended</option>
          <option value="business_reinstated">Business Reinstated</option>
          <option value="business_deleted">Business Deleted</option>
          <option value="business_updated">Business Updated</option>
        </select>
        <select
          value={targetTypeFilter}
          onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Target Types</option>
          <option value="user">User</option>
          <option value="business">Business</option>
          <option value="subscription">Subscription</option>
        </select>
      </div>

      {/* Timeline / Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No audit log entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Timestamp', 'Admin', 'Action', 'Target', 'ID', 'Details', 'IP'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{log.admin_name || `Admin #${log.admin_id}`}</td>
                    <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                    <td className="px-4 py-3"><TargetBadge targetType={log.target_type} /></td>
                    <td className="px-4 py-3 text-gray-600">#{log.target_id}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate text-xs">{formatDetails(log.details)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{log.ip_address || '—'}</td>
                  </tr>
                ))}
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

export default AdminAuditLogPage;
