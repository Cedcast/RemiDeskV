import { useEffect, useState } from 'react';
import { analyticsAPI, businessAPI } from '../../services/api';
import { ArrowPathIcon, ChartBarIcon, ArrowTrendingUpIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const RescheduleInsightsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [days, setDays] = useState(30);

  const loadBusinesses = async () => {
    try {
      const res = await businessAPI.getMyBusinesses();
      setBusinesses(res.data || []);
      if (res.data && res.data.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(String(res.data[0].id));
      }
    } catch {
      // Ignore; page still works without explicit business filter
    }
  };

  const loadInsights = async (opts = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsAPI.getReschedules(opts);
      setInsights(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load reschedule insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    const businessId = selectedBusinessId ? Number(selectedBusinessId) : undefined;
    loadInsights({ businessId, days });
  }, [selectedBusinessId, days]);

  const totalRescheduled = insights?.total_rescheduled ?? 0;
  const rescheduleRate = insights?.reschedule_rate ?? 0;
  const uniqueClients = insights?.unique_clients ?? 0;
  const avgDays = insights?.avg_days_before_reschedule ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <ArrowPathIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reschedule Insights</h1>
            <p className="text-sm text-gray-500">
              See how often clients reschedule and which services are most affected.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {businesses.length > 1 && (
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">All businesses</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !insights && !error ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && insights && insights.total_rescheduled === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 text-sm">
          <ArrowTrendingUpIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="font-medium text-gray-800 mb-1">No reschedules in this period yet</p>
          <p>
            As clients start rescheduling, you will see trends here about which services and days
            are most affected.
          </p>
        </div>
      )}

      {insights && insights.total_rescheduled > 0 && (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Rescheduled appointments
              </p>
              <p className="text-2xl font-bold text-gray-900">{totalRescheduled}</p>
              <p className="text-xs text-gray-500 mt-1">
                {insights.total_appointments_in_range
                  ? `${Math.round(rescheduleRate * 100)}% of appointments in this period`
                  : 'Based on appointments in the selected period'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Clients who rescheduled
              </p>
              <p className="text-2xl font-bold text-gray-900">{uniqueClients}</p>
              <p className="text-xs text-gray-500 mt-1">Unique clients with at least one reschedule.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Average days before reschedule
              </p>
              <p className="text-2xl font-bold text-gray-900">{avgDays.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">Time between original booking and reschedule.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                No-shows after reschedule
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {insights.no_show_after_reschedule ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Rescheduled appointments that still became no-shows.</p>
            </div>
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <ChartBarIcon className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-800">By service</h2>
                </div>
              </div>
              {insights.service_breakdown.length === 0 ? (
                <p className="text-xs text-gray-400">No service breakdown available yet.</p>
              ) : (
                <ul className="space-y-2">
                  {insights.service_breakdown.map((item) => (
                    <li key={item.service_name} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate mr-2">{item.service_name}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {item.count} reschedule{item.count === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <CalendarDaysIcon className="h-4 w-4 text-slate-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-800">By day of week</h2>
                </div>
              </div>
              {insights.dow_breakdown.length === 0 ? (
                <p className="text-xs text-gray-400">No pattern yet by day of week.</p>
              ) : (
                <ul className="space-y-2">
                  {insights.dow_breakdown.map((item) => (
                    <li key={item.day_of_week} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {dayNames[item.day_of_week] ?? `Day ${item.day_of_week}`}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700">
                        {item.count} reschedule{item.count === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent reschedules */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-800">Recent rescheduled appointments</h2>
              </div>
              <p className="text-xs text-gray-400">Last {insights.recent_reschedules.length} shown</p>
            </div>
            {insights.recent_reschedules.length === 0 ? (
              <p className="text-xs text-gray-400">No rescheduled appointments in this period.</p>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="py-2 pr-4">Date & time</th>
                      <th className="py-2 pr-4">Client</th>
                      <th className="py-2 pr-4">Service</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {insights.recent_reschedules.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 text-gray-800">
                          {item.new_start_time
                            ? format(new Date(item.new_start_time), 'EEE d MMM yyyy, HH:mm')
                            : '—'}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{item.client_name || '—'}</td>
                        <td className="py-2 pr-4 text-gray-700">{item.service_name || 'Appointment'}</td>
                        <td className="py-2 pr-4 text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RescheduleInsightsPage;
