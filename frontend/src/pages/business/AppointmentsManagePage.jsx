import { useState, useEffect, useCallback } from 'react';
import { appointmentAPI, businessAPI } from '../../services/api';
import { Button, Input, Card } from '../../components/common';
import {
  PlusIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  confirmed: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  no_show: 'bg-gray-100 text-gray-600',
  rescheduled: 'bg-purple-100 text-purple-700',
};

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'];

const defaultForm = {
  client_name: '',
  client_email: '',
  client_phone: '',
  service_name: '',
  start_time: '',
  end_time: '',
  notes: '',
  notification_channels: { email: true, sms: false, whatsapp: false },
};

const AppointmentsManagePage = () => {
  const [appointments, setAppointments] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formLoading, setFormLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const PAGE_SIZE = 15;

  const loadBusinesses = async () => {
    try {
      const res = await businessAPI.getMyBusinesses();
      setBusinesses(res.data);
      if (res.data.length > 0) setSelectedBusiness(res.data[0].id);
    } catch {
      toast.error('Failed to load businesses');
    }
  };

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: PAGE_SIZE };
      if (selectedBusiness) params.business_id = selectedBusiness;
      if (filterStatus) params.status = filterStatus;
      const res = await appointmentAPI.list(params);
      setAppointments(res.data.appointments);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [page, selectedBusiness, filterStatus]);

  useEffect(() => { loadBusinesses(); }, []);
  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChannelToggle = (channel) => {
    setForm((prev) => ({
      ...prev,
      notification_channels: {
        ...prev.notification_channels,
        [channel]: !prev.notification_channels[channel],
      },
    }));
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!selectedBusiness) {
      toast.error('Please select a business first');
      return;
    }
    if (!form.start_time || !form.end_time) {
      toast.error('Please set start and end times');
      return;
    }

    setFormLoading(true);
    try {
      await appointmentAPI.create({
        business_id: parseInt(selectedBusiness),
        client_name: form.client_name || undefined,
        client_email: form.client_email || undefined,
        client_phone: form.client_phone || undefined,
        service_name: form.service_name || undefined,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        notes: form.notes || undefined,
        notification_channels: form.notification_channels,
      });
      toast.success('Appointment created!');
      setForm(defaultForm);
      setShowForm(false);
      loadAppointments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create appointment');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await appointmentAPI.updateStatus(id, { status: newStatus });
      toast.success('Status updated');
      loadAppointments();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500">{total} total appointments</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Create Appointment Form */}
      {showForm && (
        <Card className="mb-6">
          <Card.Header>
            <h2 className="font-semibold text-gray-800">Create New Appointment</h2>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              {/* Business selector */}
              {businesses.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business</label>
                  <select
                    value={selectedBusiness}
                    onChange={(e) => setSelectedBusiness(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Client Name"
                  value={form.client_name}
                  onChange={(e) => handleFormChange('client_name', e.target.value)}
                  placeholder="John Smith"
                />
                <Input
                  label="Client Email"
                  type="email"
                  value={form.client_email}
                  onChange={(e) => handleFormChange('client_email', e.target.value)}
                  placeholder="john@example.com"
                />
                <Input
                  label="Client Phone"
                  type="tel"
                  value={form.client_phone}
                  onChange={(e) => handleFormChange('client_phone', e.target.value)}
                  placeholder="+44 7700 900000"
                />
              </div>

              <Input
                label="Service / Description"
                value={form.service_name}
                onChange={(e) => handleFormChange('service_name', e.target.value)}
                placeholder="e.g. Haircut, Consultation, Massage…"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => handleFormChange('start_time', e.target.value)}
                />
                <Input
                  label="End Time"
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(e) => handleFormChange('end_time', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  rows={2}
                  placeholder="Optional notes…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Notification Channel Preferences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notify client via
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.notification_channels.email}
                      onChange={() => handleChannelToggle('email')}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.notification_channels.sms}
                      onChange={() => handleChannelToggle('sms')}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <PhoneIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">SMS</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.notification_channels.whatsapp}
                      onChange={() => handleChannelToggle('whatsapp')}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">WhatsApp</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  A confirmation is sent immediately; reminders are sent 24h and 1h before.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={formLoading}>
                  Create Appointment
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowForm(false); setForm(defaultForm); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
          ))}
        </select>
        {businesses.length > 1 && (
          <select
            value={selectedBusiness}
            onChange={(e) => { setSelectedBusiness(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Appointments Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No appointments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Date & Time', 'Service', 'Status', 'Notes', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-800">
                      {format(new Date(apt.start_time), 'EEE d MMM yyyy')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(apt.start_time), 'HH:mm')} –{' '}
                      {format(new Date(apt.end_time), 'HH:mm')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {apt.service_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {apt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {apt.notes || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {['confirmed', 'completed', 'cancelled'].map((s) =>
                        s !== apt.status ? (
                          <button
                            key={s}
                            onClick={() => handleStatusUpdate(apt.id, s)}
                            title={`Mark as ${s}`}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          >
                            {s === 'completed' ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            ) : s === 'cancelled' ? (
                              <XCircleIcon className="h-4 w-4 text-red-400" />
                            ) : (
                              <ArrowPathIcon className="h-4 w-4 text-indigo-400" />
                            )}
                          </button>
                        ) : null
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AppointmentsManagePage;
