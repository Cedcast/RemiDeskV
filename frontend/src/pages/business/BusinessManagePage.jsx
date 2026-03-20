import { useState, useEffect } from 'react';
import { businessAPI, serviceAPI, availabilityAPI } from '../../services/api';
import { Card, Button, Input, Loading } from '../../components/common';
import {
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

const COUNTRY_OPTIONS = [
  { value: 'UK', label: 'United Kingdom (UK)', timezone: 'Europe/London' },
  { value: 'CA', label: 'Canada', timezone: 'America/Toronto' },
  { value: 'AU', label: 'Australia', timezone: 'Australia/Sydney' },
];

const getCountryMeta = (value) => COUNTRY_OPTIONS.find((c) => c.value === value) || null;

const BusinessManagePage = () => {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Forms state
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [editingService, setEditingService] = useState(null);
  
  const [businessForm, setBusinessForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    business_type: '',
    timezone: 'UTC',
  });
  
  // New business type field

  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    price: 0,
  });
  
  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchServicesAndSchedules();
    }
  }, [selectedBusiness]);

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

  const fetchServicesAndSchedules = async () => {
    if (!selectedBusiness) return;
    
    try {
      const [servicesRes, schedulesRes] = await Promise.all([
        serviceAPI.getByBusiness(selectedBusiness.id),
        availabilityAPI.getSchedules(selectedBusiness.id),
      ]);
      setServices(servicesRes.data);
      setSchedules(schedulesRes.data);
    } catch {
      // Error fetching services/schedules
    }
  };

  const handleCreateStarterServices = async () => {
    if (!selectedBusiness) return;
    try {
      await serviceAPI.createStarterForBusiness(selectedBusiness.id);
      toast.success('Starter services added for this business');
      fetchServicesAndSchedules();
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to add starter services';
      toast.error(message);
    }
  };

  // Business handlers
  const handleBusinessSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBusiness) {
        await businessAPI.update(editingBusiness.id, businessForm);
        toast.success('Business updated');
      } else {
        await businessAPI.create(businessForm);
        toast.success('Business created');
      }
      setShowBusinessForm(false);
      setEditingBusiness(null);
      resetBusinessForm();
      fetchBusinesses();
    } catch {
      toast.error('Failed to save business');
    }
  };

  const handleBusinessFormChange = (e) => {
    const { name, value } = e.target;
    setBusinessForm((prev) => {
      if (name === 'country') {
        const meta = getCountryMeta(value);
        const nextTimezone = meta?.timezone || prev.timezone || 'UTC';
        return { ...prev, country: value, timezone: nextTimezone };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleEditBusiness = (business) => {
    setEditingBusiness(business);
    setBusinessForm({
      name: business.name || '',
      description: business.description || '',
      address: business.address || '',
      city: business.city || '',
      state: business.state || '',
      zip_code: business.zip_code || '',
      country: business.country || '',
      phone: business.phone || '',
      email: business.email || '',
      website: business.website || '',
      business_type: business.business_type || '',
      timezone: business.timezone || 'UTC',
    });
    setShowBusinessForm(true);
  };

  const resetBusinessForm = () => {
    setBusinessForm({
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
      phone: '',
      email: '',
      website: '',
      business_type: '',
      timezone: 'UTC',
    });
  };

  // Service handlers
  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingService) {
        await serviceAPI.update(editingService.id, serviceForm);
        toast.success('Service updated');
      } else {
        await serviceAPI.create({
          ...serviceForm,
          business_id: selectedBusiness.id,
        });
        toast.success('Service created');
      }
      setShowServiceForm(false);
      setEditingService(null);
      resetServiceForm();
      fetchServicesAndSchedules();
    } catch {
      toast.error('Failed to save service');
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price,
    });
    setShowServiceForm(true);
  };

  const handleDeleteService = async (serviceId) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await serviceAPI.delete(serviceId);
      toast.success('Service deleted');
      fetchServicesAndSchedules();
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const resetServiceForm = () => {
    setServiceForm({
      name: '',
      description: '',
      duration_minutes: 60,
      price: 0,
    });
  };

  // Schedule handlers
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await availabilityAPI.createSchedule({
        business_id: selectedBusiness.id,
        day_of_week: parseInt(scheduleForm.day_of_week),
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        is_available: scheduleForm.is_available,
      });
      toast.success('Schedule created');
      setShowScheduleForm(false);
      resetScheduleForm();
      fetchServicesAndSchedules();
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to save schedule';
      toast.error(message);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await availabilityAPI.deleteSchedule(scheduleId);
      toast.success('Schedule deleted');
      fetchServicesAndSchedules();
    } catch {
      toast.error('Failed to delete schedule');
    }
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      day_of_week: 0,
      start_time: '09:00',
      end_time: '17:00',
      is_available: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Business</h1>
          <p className="mt-2 text-gray-600">
            Update your business profile, services, and hours
          </p>
        </div>
        {businesses.length === 0 && (
          <Button onClick={() => setShowBusinessForm(true)}>
            <PlusIcon className="h-5 w-5 mr-1" />
            Create Business
          </Button>
        )}
      </div>

      {/* Business Selector */}
      {businesses.length > 0 && (
        <div className="mb-6 flex items-center space-x-4">
          <select
            value={selectedBusiness?.id || ''}
            onChange={(e) => {
              const business = businesses.find(
                (b) => b.id === parseInt(e.target.value)
              );
              setSelectedBusiness(business);
            }}
            className="block w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
          {selectedBusiness && (
            <Button
              variant="outline"
              onClick={() => handleEditBusiness(selectedBusiness)}
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      )}

      {/* Business Form Modal */}
      {showBusinessForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowBusinessForm(false);
                setEditingBusiness(null);
                resetBusinessForm();
              }}
            />
            <Card className="relative z-50 w-full max-w-lg">
              <Card.Header>
                <h3 className="text-lg font-semibold">
                  {editingBusiness ? 'Edit Business' : 'Create Business'}
                </h3>
              </Card.Header>
              <Card.Body>
                <form onSubmit={handleBusinessSubmit} className="space-y-4">
                  <Input
                    label="Business Name"
                    value={businessForm.name}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, name: e.target.value })
                    }
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        name="country"
                        value={businessForm.country}
                        onChange={handleBusinessFormChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select country</option>
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Used to normalise your timezone and phone numbers.
                      </p>
                    </div>
                    <div>
                      <Input
                        label="Timezone"
                        value={businessForm.timezone}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            timezone: e.target.value,
                          })
                        }
                        placeholder="e.g. Europe/London"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Type
                    </label>
                    <select
                      name="business_type"
                      value={businessForm.business_type}
                      onChange={handleBusinessFormChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select a business type</option>
                      <option value="salon">Salon</option>
                      <option value="barber">Barber</option>
                      <option value="vet_clinic">Vet clinic</option>
                      <option value="therapist">Therapist / Counseling</option>
                      <option value="gym">Gym / Fitness</option>
                      <option value="spa">Spa / Wellness</option>
                      <option value="other">Other service business</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      This helps RemiDesk personalize reminders and insights for your niche.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={businessForm.description}
                      onChange={(e) =>
                        setBusinessForm({
                          ...businessForm,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <Input
                    label="Address"
                    value={businessForm.address}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, address: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      value={businessForm.city}
                      onChange={(e) =>
                        setBusinessForm({ ...businessForm, city: e.target.value })
                      }
                    />
                    <Input
                      label="State"
                      value={businessForm.state}
                      onChange={(e) =>
                        setBusinessForm({ ...businessForm, state: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="ZIP Code"
                      value={businessForm.zip_code}
                      onChange={(e) =>
                        setBusinessForm({
                          ...businessForm,
                          zip_code: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Phone"
                      value={businessForm.phone}
                      onChange={(e) =>
                        setBusinessForm({ ...businessForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <Input
                    label="Email"
                    type="email"
                    value={businessForm.email}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, email: e.target.value })
                    }
                  />
                  <Input
                    label="Website"
                    value={businessForm.website}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, website: e.target.value })
                    }
                  />
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBusinessForm(false);
                        setEditingBusiness(null);
                        resetBusinessForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingBusiness ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {selectedBusiness && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Services Section */}
          <div id="services">
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Services</h2>
                  <Button size="sm" onClick={() => setShowServiceForm(true)}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Service
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {services.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 space-y-3">
                    <p className="text-sm">No services yet for this business.</p>
                    {selectedBusiness?.business_type ? (
                      <>
                        <p className="text-xs text-gray-500">
                          Based on your business type, we can add a few common starter services
                          for you. You can edit or remove them anytime.
                        </p>
                        <div className="flex justify-center gap-2">
                          <Button size="sm" onClick={handleCreateStarterServices}>
                            Add starter services
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowServiceForm(true)}
                          >
                            Add custom service
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => setShowServiceForm(true)}>
                        Add your first service
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="p-4 flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {service.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {service.duration_minutes} min • $
                            {service.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditService(service)}
                            className="p-1 text-gray-400 hover:text-indigo-600"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Schedule Section */}
          <div>
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Business Hours</h2>
                  <Button size="sm" onClick={() => setShowScheduleForm(true)}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Hours
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {schedules.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No schedule set. Add your business hours.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {schedules
                      .sort((a, b) => a.day_of_week - b.day_of_week)
                      .map((schedule) => (
                        <div
                          key={schedule.id}
                          className="p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {DAYS_OF_WEEK.find(
                                  (d) => d.value === schedule.day_of_week
                                )?.label}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {schedule.start_time} - {schedule.end_time}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {/* Service Form Modal */}
      {showServiceForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowServiceForm(false);
                setEditingService(null);
                resetServiceForm();
              }}
            />
            <Card className="relative z-50 w-full max-w-md">
              <Card.Header>
                <h3 className="text-lg font-semibold">
                  {editingService ? 'Edit Service' : 'Add Service'}
                </h3>
              </Card.Header>
              <Card.Body>
                <form onSubmit={handleServiceSubmit} className="space-y-4">
                  <Input
                    label="Service Name"
                    value={serviceForm.name}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, name: e.target.value })
                    }
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={serviceForm.description}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <Input
                    label="Duration (minutes)"
                    type="number"
                    value={serviceForm.duration_minutes}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        duration_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                    min={15}
                    required
                  />
                  <Input
                    label="Price ($)"
                    type="number"
                    step="0.01"
                    value={serviceForm.price}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    min={0}
                    required
                  />
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowServiceForm(false);
                        setEditingService(null);
                        resetServiceForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingService ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowScheduleForm(false);
                resetScheduleForm();
              }}
            />
            <Card className="relative z-50 w-full max-w-md">
              <Card.Header>
                <h3 className="text-lg font-semibold">Add Business Hours</h3>
              </Card.Header>
              <Card.Body>
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day of Week
                    </label>
                    <select
                      value={scheduleForm.day_of_week}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          day_of_week: parseInt(e.target.value),
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Start Time"
                      type="time"
                      value={scheduleForm.start_time}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          start_time: e.target.value,
                        })
                      }
                      required
                    />
                    <Input
                      label="End Time"
                      type="time"
                      value={scheduleForm.end_time}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          end_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowScheduleForm(false);
                        resetScheduleForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Add</Button>
                  </div>
                </form>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessManagePage;
