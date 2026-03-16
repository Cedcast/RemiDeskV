import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { appointmentAPI, businessAPI } from '../../services/api';
import { Card, Button, Loading } from '../../components/common';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

const AppointmentsManagePage = () => {
  const [appointments, setAppointments] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0 });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchAppointments();
    }
  }, [selectedBusiness, filter, pagination.page]);

  const fetchBusinesses = async () => {
    try {
      const response = await businessAPI.getMyBusinesses();
      setBusinesses(response.data);
      if (response.data.length > 0) {
        setSelectedBusiness(response.data[0]);
      }
    } catch {
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        size: pagination.size,
        business_id: selectedBusiness.id,
      };
      
      if (filter !== 'all') {
        params.status = filter;
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

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      await appointmentAPI.updateStatus(appointmentId, { status: newStatus });
      toast.success(`Appointment ${newStatus}`);
      fetchAppointments();
    } catch {
      toast.error('Failed to update appointment');
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.size);

  if (businesses.length === 0 && !loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <Card.Body className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Create a business first to manage appointments
            </p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
        <p className="mt-2 text-gray-600">Manage your business appointments</p>
      </div>

      {/* Business Selector */}
      {businesses.length > 1 && (
        <div className="mb-6">
          <select
            value={selectedBusiness?.id || ''}
            onChange={(e) => {
              const business = businesses.find(
                (b) => b.id === parseInt(e.target.value)
              );
              setSelectedBusiness(business);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="block w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
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
                        <span className="text-sm text-gray-500">
                          ID: {appointment.id}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-gray-500">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-2" />
                          Customer #{appointment.customer_id}
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(
                            parseISO(appointment.start_time),
                            'EEEE, MMMM d, yyyy'
                          )}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          {format(parseISO(appointment.start_time), 'h:mm a')} -{' '}
                          {format(parseISO(appointment.end_time), 'h:mm a')}
                        </div>
                      </div>

                      {appointment.customer_notes && (
                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Customer notes:</span>{' '}
                          {appointment.customer_notes}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 sm:mt-0 sm:ml-4 flex flex-wrap gap-2">
                      {appointment.status === 'pending' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(appointment.id, 'confirmed')
                            }
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(appointment.id, 'cancelled')
                            }
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {appointment.status === 'confirmed' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(appointment.id, 'completed')
                            }
                          >
                            Complete
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(appointment.id, 'no_show')
                            }
                          >
                            No Show
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(appointment.id, 'cancelled')
                            }
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
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

export default AppointmentsManagePage;
