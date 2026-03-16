import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { appointmentAPI, businessAPI } from '../../services/api';
import { Card, Loading } from '../../components/common';
import {
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, appointmentsRes, businessesRes] = await Promise.all([
        appointmentAPI.getDashboardStats(),
        appointmentAPI.getUpcoming(5),
        businessAPI.getMyBusinesses(),
      ]);
      setStats(statsRes.data);
      setUpcomingAppointments(appointmentsRes.data);
      setBusinesses(businessesRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Appointments',
      value: stats?.total_appointments || 0,
      icon: CalendarIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Upcoming',
      value: stats?.upcoming_appointments || 0,
      icon: ClockIcon,
      color: 'bg-yellow-500',
    },
    {
      name: 'Completed',
      value: stats?.completed_appointments || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Total Revenue',
      value: `$${(stats?.total_revenue || 0).toFixed(2)}`,
      icon: CurrencyDollarIcon,
      color: 'bg-indigo-500',
    },
    {
      name: 'Total Customers',
      value: stats?.total_customers || 0,
      icon: UserGroupIcon,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of your business performance
        </p>
      </div>

      {/* Check if user has businesses */}
      {businesses.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No business yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first business to start accepting appointments
            </p>
            <Link
              to="/dashboard/business"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Business
            </Link>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((stat) => (
              <Card key={stat.name}>
                <Card.Body>
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Appointments */}
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
                  <Link
                    to="/dashboard/appointments"
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    View all →
                  </Link>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {upcomingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No upcoming appointments
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              Customer #{appointment.customer_id}
                            </p>
                            <p className="text-sm text-gray-500">
                              Service #{appointment.service_id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {format(parseISO(appointment.start_time), 'MMM d')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(parseISO(appointment.start_time), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Quick Actions */}
            <Card>
              <Card.Header>
                <h2 className="text-lg font-semibold">Quick Actions</h2>
              </Card.Header>
              <Card.Body>
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to="/dashboard/appointments"
                    className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <CalendarIcon className="h-8 w-8 text-indigo-600 mb-2" />
                    <p className="font-medium text-gray-900">Manage Appointments</p>
                    <p className="text-sm text-gray-500">View and manage bookings</p>
                  </Link>
                  <Link
                    to="/dashboard/business"
                    className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <ArrowTrendingUpIcon className="h-8 w-8 text-indigo-600 mb-2" />
                    <p className="font-medium text-gray-900">Business Settings</p>
                    <p className="text-sm text-gray-500">Update services & hours</p>
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
