import { useState, useEffect, useCallback } from 'react';
import { appointmentAPI, businessAPI, serviceAPI } from '../../services/api';
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
  // service_id is derived from selection when using existing services
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
  const [dateRange, setDateRange] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const PAGE_SIZE = 15;

  const getDialCodeForCountry = (country) => {
    if (!country) return '';
    const upper = country.toUpperCase();
    if (upper === 'UK' || upper === 'GB' || country === 'United Kingdom') return '+44';
    if (upper === 'CA' || country === 'Canada') return '+1';
    if (upper === 'AU' || country === 'Australia') return '+61';
    return '';
  };

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
      if (dateRange) params.range_key = dateRange;
      const res = await appointmentAPI.list(params);
      setAppointments(res.data.appointments);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [page, selectedBusiness, filterStatus, dateRange]);

  const loadServices = useCallback(async () => {
    if (!selectedBusiness) {
      setServices([]);
      return;
    }
    setServicesLoading(true);
    try {
      const res = await serviceAPI.getByBusiness(
        typeof selectedBusiness === 'string' ? parseInt(selectedBusiness, 10) : selectedBusiness
      );
      setServices(res.data || []);
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, [selectedBusiness]);

  useEffect(() => { loadBusinesses(); }, []);
  useEffect(() => { loadAppointments(); }, [loadAppointments]);
  useEffect(() => { loadServices(); }, [loadServices]);

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
      const businessIdInt =
        typeof selectedBusiness === 'string'
          ? parseInt(selectedBusiness, 10)
          : selectedBusiness;

      await appointmentAPI.create({
        business_id: parseInt(selectedBusiness),
        client_name: form.client_name || undefined,
        client_email: form.client_email || undefined,
        client_phone: form.client_phone || undefined,
        service_id: selectedServiceId ? parseInt(selectedServiceId, 10) : undefined,
        service_name: selectedServiceId ? undefined : form.service_name || undefined,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        notes: form.notes || undefined,
        notification_channels: form.notification_channels,
      });
      toast.success('Appointment created!');
      setForm(defaultForm);
      setSelectedServiceId('');
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

  const selectedBiz = businesses.find(
    (b) => b.id === (typeof selectedBusiness === 'string' ? parseInt(selectedBusiness, 10) : selectedBusiness)
  );
  const businessDialCode = getDialCodeForCountry(selectedBiz?.country);
  const fullClientPhone = form.client_phone || '';
  const localClientPhone =
    businessDialCode && fullClientPhone.startsWith(businessDialCode)
      ? fullClientPhone.slice(businessDialCode.length)
      : fullClientPhone;

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Phone
                  </label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                    <span className="px-2 bg-gray-50 text-gray-600 text-sm flex items-center border-r border-gray-200 min-w-[3.2rem] justify-center">
                      {businessDialCode || '+ code'}
                    </span>
                    <input
                      type="tel"
                      value={localClientPhone}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        const full = businessDialCode ? `${businessDialCode}${raw}` : raw;
                        setForm((prev) => ({ ...prev, client_phone: full }));
                      }}
                      placeholder={businessDialCode ? 'Enter number without country code' : 'Client phone number'}
                      className="flex-1 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Saved as {businessDialCode || ''}
                    {localClientPhone || (businessDialCode ? '•••' : '')} for SMS/WhatsApp reminders.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service
                  </label>
                  {servicesLoading ? (
                    <p className="text-xs text-gray-400">Loading services…</p>
                  ) : services.length > 0 ? (
                    <select
                      value={selectedServiceId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom') {
                          setSelectedServiceId('');
                        } else {
                          setSelectedServiceId(val);
                          handleFormChange('service_name', '');
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select a service…</option>
                      {services.map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.name} ({svc.duration_minutes} min)
                        </option>
                      ))}
                      <option value="__custom">Custom / not listed</option>
                    </select>
                  ) : (
                    <p className="text-xs text-gray-500">
                      No services yet. Type a description below or add services in
                      Settings.
                    </p>
                  )}
                </div>

                <Input
                  label="Service name / description"
                  value={form.service_name}
                  onChange={(e) => handleFormChange('service_name', e.target.value)}
                  placeholder="e.g. Haircut, Consultation, Massage…"
                />
              </div>

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
              {appointments.map((apt) => {
                const summary = apt.notification_summary || {};
                const steps = [
                  { key: 'confirmation', label: 'Booked' },
                  { key: 'reminder_24h', label: '24h' },
                  { key: 'reminder_2h', label: '2h' },
                  { key: 'followup', label: 'Follow-up' },
                ];

                return (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      <p className="text-sm font-medium text-gray-800">
                        {format(new Date(apt.start_time), 'EEE d MMM yyyy')}
                      </p>
                      <p className="text-xs text-gray-400 mb-1">
                        {format(new Date(apt.start_time), 'HH:mm')} –{' '}
                        {format(new Date(apt.end_time), 'HH:mm')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {steps.map(({ key, label }) => {
                          const step = summary[key];
                          const sent = step?.sent;
                          return (
                            <div key={key} className="flex flex-col items-center">
                              <span
                                className={`h-2.5 w-2.5 rounded-full border ${
                                  sent
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'bg-gray-100 border-gray-300'
                                }`}
                                title={
                                  sent && step?.sent_at
                                    ? `${label} sent via ${(step.channels || []).join(
                                        ', '
                                      )} on ${format(new Date(step.sent_at), 'd MMM HH:mm')}`
                                    : `${label} not sent yet`
                                }
                              />
                              <span className="mt-0.5 text-[10px] text-gray-400">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 align-top">
                      <div className="flex items-center gap-2">
                        <span>{apt.service_name || '—'}</span>
                        {apt.ai_messages_enabled && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            AI-powered
                          </span>
                        )}
                      </div>
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
                );
              })}
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
