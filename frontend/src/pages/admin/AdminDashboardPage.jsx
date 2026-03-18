import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  UsersIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  BanknotesIcon,
  CalendarIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
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
  LineChart,
  Line,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

const StatCard = ({ title, value, icon: Icon, color = 'indigo', subtitle, to }) => {
  const colorMap = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  };
  const { bg, text } = colorMap[color] || colorMap.indigo;

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-lg ${bg}`}>
        <Icon className={`h-6 w-6 ${text}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
};

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminAPI.getStats(), adminAPI.getGrowthStats()])
      .then(([statsRes, growthRes]) => {
        setStats(statsRes.data);
        setGrowth(growthRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const revenueUSD = stats ? (stats.total_revenue_usd_cents / 100).toFixed(2) : '0.00';
  const deliveryRate =
    stats && stats.notifications_sent + stats.notifications_failed > 0
      ? (
          (stats.notifications_sent /
            (stats.notifications_sent + stats.notifications_failed)) *
          100
        ).toFixed(1)
      : 'N/A';

  const signupChartData = growth?.monthly_signups?.map((m) => ({
    month: m.month.slice(5), // "MM" portion
    signups: m.count,
  })) || [];

  const appointmentChartData = growth?.monthly_appointments?.map((m) => ({
    month: m.month.slice(5),
    appointments: m.count,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
        <p className="text-sm text-gray-500 mt-1">Real-time statistics across the entire platform</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.total_users ?? '—'}
          icon={UsersIcon}
          color="indigo"
          to="/admin/users"
        />
        <StatCard
          title="Total Businesses"
          value={stats?.total_businesses ?? '—'}
          icon={BuildingOfficeIcon}
          color="blue"
          to="/admin/businesses"
        />
        <StatCard
          title="Active Subscriptions"
          value={stats?.active_subscriptions ?? '—'}
          icon={CreditCardIcon}
          color="green"
          subtitle={`${stats?.trial_users ?? 0} on free trial`}
          to="/admin/subscriptions"
        />
        <StatCard
          title="Total Revenue"
          value={`$${revenueUSD}`}
          icon={BanknotesIcon}
          color="amber"
          subtitle="From completed payments"
          to="/admin/payments"
        />
        <StatCard
          title="Total Appointments"
          value={stats?.total_appointments ?? '—'}
          icon={CalendarIcon}
          color="purple"
        />
        <StatCard
          title="Notification Delivery"
          value={deliveryRate === 'N/A' ? 'N/A' : `${deliveryRate}%`}
          icon={BellIcon}
          color={parseFloat(deliveryRate) >= 90 ? 'green' : 'red'}
          subtitle={`${stats?.notifications_sent ?? 0} sent / ${stats?.notifications_failed ?? 0} failed`}
          to="/admin/notifications"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly signups bar chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly User Signups</h3>
          {signupChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={signupChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="signups" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">No signup data yet</p>
          )}
        </div>

        {/* Monthly appointments line chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly Appointments</h3>
          {appointmentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={appointmentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="appointments"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">No appointment data yet</p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Manage Users', to: '/admin/users', icon: UsersIcon },
            { label: 'Manage Businesses', to: '/admin/businesses', icon: BuildingOfficeIcon },
            { label: 'View Subscriptions', to: '/admin/subscriptions', icon: CreditCardIcon },
            { label: 'Audit Log', to: '/admin/audit-log', icon: CheckCircleIcon },
          ].map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-center"
            >
              <link.icon className="h-6 w-6 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
