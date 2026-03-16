import { useState, useEffect } from 'react';
import { format, parseISO, isPast } from 'date-fns';
import { appointmentAPI } from '../../services/api';
import { Card, Button, Loading } from '../../components/common';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: ExclamationCircleIcon,
    label: 'Pending',
  },
  confirmed: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon,
    label: 'Confirmed',
  },
  cancelled: {
    color: 'bg-red-100 text-red-800',
    icon: XCircleIcon,
    label: 'Cancelled',
  },
  completed: {
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircleIcon,
    label: 'Completed',
  },
  no_show: {
    color: 'bg-gray-100 text-gray-800',
    icon: XCircleIcon,
    label: 'No Show',
  },
};

const MyAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [pagination, setPagination] = useState({ page: 1, size: 10, total: 0 });

  useEffect(() => {
    fetchAppointments();
  }, [filter, pagination.page]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        size: pagination.size,
      };
      
      if (filter !== 'all') {
        if (filter === 'upcoming') {
          params.status = 'confirmed';
        } else {
          params.status = filter;
        }
      }
      
      const response = await appointmentAPI.list(params);
      setAppointments(response.data.appointments);
      setPagination((prev) => ({ ...prev, total: response.data.total }));
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
      await appointmentAPI.cancel(appointmentId);
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch {
      toast.error('Failed to cancel appointment');
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.size);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
        <p className="mt-2 text-gray-600">View and manage your appointments</p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'all', label: 'All' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <Loading size="lg" className="py-12" />
      ) : appointments.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No appointments found</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const status = statusConfig[appointment.status];
            const StatusIcon = status.icon;
            const isUpcoming = !isPast(parseISO(appointment.start_time));
            const canCancel =
              isUpcoming &&
              ['pending', 'confirmed'].includes(appointment.status);

            return (
              <Card key={appointment.id}>
                <Card.Body>
                  <div className="sm:flex sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5 mr-1" />
                          {status.label}
                        </span>
                      </div>

                      <h3 className="text-lg font-medium text-gray-900">
                        Service #{appointment.service_id}
                      </h3>

                      <div className="mt-2 space-y-1 text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(parseISO(appointment.start_time), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          {format(parseISO(appointment.start_time), 'h:mm a')} -{' '}
                          {format(parseISO(appointment.end_time), 'h:mm a')}
                        </div>
                      </div>

                      {appointment.customer_notes && (
                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span>{' '}
                          {appointment.customer_notes}
                        </p>
                      )}

                      {appointment.cancellation_reason && (
                        <p className="mt-2 text-sm text-red-600">
                          <span className="font-medium">Cancellation reason:</span>{' '}
                          {appointment.cancellation_reason}
                        </p>
                      )}
                    </div>

                    {canCancel && (
                      <div className="mt-4 sm:mt-0 sm:ml-4">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancel(appointment.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2">
          <button
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {pagination.page} of {totalPages}
          </span>
          <button
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
            disabled={pagination.page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MyAppointmentsPage;
