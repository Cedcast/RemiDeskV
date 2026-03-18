import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const StatusBadge = ({ isActive, suspended }) => {
  if (suspended) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Suspended</span>;
  if (!isActive) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Inactive</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>;
};

const SuspendModal = ({ business, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Suspend Business</h3>
        <p className="text-sm text-gray-600 mb-4">
          Suspend <strong>{business.name}</strong>?
        </p>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => onConfirm(reason)} className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700">Suspend</button>
        </div>
      </div>
    </div>
  );
};

const AdminBusinessesPage = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [suspendTarget, setSuspendTarget] = useState(null);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: 20 };
      if (search) params.search = search;
      if (countryFilter) params.country = countryFilter;
      const res = await adminAPI.getBusinesses(params);
      setBusinesses(res.data.items);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, [page, search, countryFilter]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const handleSuspend = async (reason) => {
    try {
      await adminAPI.suspendBusiness(suspendTarget.id, { reason });
      toast.success(`Business "${suspendTarget.name}" suspended`);
      setSuspendTarget(null);
      fetchBusinesses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to suspend');
    }
  };

  const handleReinstate = async (biz) => {
    try {
      await adminAPI.reinstateBusiness(biz.id);
      toast.success(`Business "${biz.name}" reinstated`);
      fetchBusinesses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reinstate');
    }
  };

  const handleDelete = async (biz) => {
    if (!window.confirm(`Soft-delete "${biz.name}"? This will deactivate it.`)) return;
    try {
      await adminAPI.deleteBusiness(biz.id);
      toast.success(`Business "${biz.name}" deleted`);
      fetchBusinesses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Business Management</h2>
        <p className="text-sm text-gray-500 mt-1">{total} total businesses</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by country…"
          value={countryFilter}
          onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-36"
        />
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
                  {['Name', 'Owner', 'Location', 'Status', 'Appointments', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {businesses.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/admin/businesses/${b.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{b.owner_name}</p>
                      <p className="text-xs text-gray-400">{b.owner_email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{[b.city, b.country].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={b.is_active} suspended={!!b.suspended_at} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.appointment_count}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {b.suspended_at ? (
                          <button onClick={() => handleReinstate(b)} className="text-xs text-green-600 hover:text-green-800 font-medium">
                            Reinstate
                          </button>
                        ) : (
                          <button onClick={() => setSuspendTarget(b)} className="text-xs text-orange-600 hover:text-orange-800 font-medium">
                            Suspend
                          </button>
                        )}
                        <button onClick={() => handleDelete(b)} className="text-xs text-red-600 hover:text-red-800 font-medium">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {businesses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No businesses found</td>
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

      {suspendTarget && (
        <SuspendModal business={suspendTarget} onClose={() => setSuspendTarget(null)} onConfirm={handleSuspend} />
      )}
    </div>
  );
};

export default AdminBusinessesPage;
