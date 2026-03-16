import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, appointmentAPI } from '../../services/api';
import {
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

const STATUS_COLORS = {
  confirmed: '#6366f1',
  completed: '#22c55e',
  cancelled: '#ef4444',
  pending: '#f59e0b',
  no_show: '#94a3b8',
  rescheduled: '#8b5cf6',
};

const StatCard = ({ title, value, icon: Icon, color = 'indigo', subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
    <div className={`p-3 rounded-lg bg-${color}-50`}>
      <Icon className={`h-6 w-6 text-${color}-600`} />
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, upcomingRes] = await Promise.all([
        analyticsAPI.getStats(),
        appointmentAPI.getUpcoming(5),
      ]);
      setStats(statsRes.data);
      setUpcoming(upcomingRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const pieData = stats
    ? Object.entries(stats.status_breakdown)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back! Here's what's happening.</p>
        </div>
        <Link
          to="/dashboard/appointments"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Appointment
        </Link>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Appointments"
            value={stats.total_appointments}
            icon={CalendarIcon}
            color="indigo"
          />
          <StatCard
            title="This Month"
            value={stats.this_month_appointments}
            icon={CalendarIcon}
            color="blue"
            subtitle={`${stats.this_year_appointments} this year`}
          />
          <StatCard
            title="Upcoming"
            value={stats.upcoming_appointments}
            icon={ClockIcon}
            color="amber"
          />
          <StatCard
            title="Completed"
            value={stats.completed_appointments}
            icon={CheckCircleIcon}
            color="green"
          />
          <StatCard
            title="Cancelled"
            value={stats.cancelled_appointments}
            icon={XCircleIcon}
            color="red"
          />
          <StatCard
            title="Rescheduled"
            value={stats.rescheduled_appointments}
            icon={ArrowPathIcon}
            color="purple"
          />
          <StatCard
            title="Total Clients"
            value={stats.total_clients}
            icon={UserGroupIcon}
            color="teal"
          />
          <StatCard
            title="Avg Duration"
            value={`${stats.average_duration_minutes} min`}
            icon={ClockIcon}
            color="gray"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Monthly Trend Chart */}
        {stats?.monthly_trend?.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Appointments — Last 12 Months</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthly_trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status Breakdown Pie */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Status Breakdown</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Upcoming Appointments</h2>
          <Link
            to="/dashboard/appointments"
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            View all →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No upcoming appointments</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {apt.service_name || 'Appointment'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(apt.start_time), 'EEE d MMM, HH:mm')}
                  </p>
                </div>
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    background: `${STATUS_COLORS[apt.status]}20`,
                    color: STATUS_COLORS[apt.status],
                  }}
                >
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
