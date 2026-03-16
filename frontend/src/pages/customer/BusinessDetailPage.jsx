import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, addDays, startOfToday } from 'date-fns';
import { businessAPI, serviceAPI, availabilityAPI, appointmentAPI } from '../../services/api';
import { Card, Button, Loading } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const BusinessDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState(1); // 1: service, 2: date/time, 3: confirm

  // Generate available dates (next 14 days)
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i + 1));

  useEffect(() => {
    fetchBusinessData();
  }, [id]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedService, selectedDate]);

  const fetchBusinessData = async () => {
    try {
      const [businessRes, servicesRes] = await Promise.all([
        businessAPI.get(id),
        serviceAPI.getByBusiness(id),
      ]);
      setBusiness(businessRes.data);
      setServices(servicesRes.data);
    } catch (error) {
      toast.error('Failed to load business details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await availabilityAPI.getSlots(id, selectedService.id, dateStr);
      setAvailableSlots(response.data.slots);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/businesses/${id}` } } });
      return;
    }

    setBooking(true);
    try {
      await appointmentAPI.create({
        business_id: parseInt(id),
        service_id: selectedService.id,
        start_time: selectedSlot.start_time,
        customer_notes: customerNotes || null,
      });
      toast.success('Appointment booked successfully!');
      navigate('/my-appointments');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to book appointment';
      toast.error(message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <Card.Body className="text-center py-12">
            <p className="text-gray-500">Business not found</p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Business Header */}
      <Card className="mb-8">
        <Card.Body>
          <div className="md:flex md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
              {business.description && (
                <p className="mt-2 text-gray-600">{business.description}</p>
              )}
              <div className="mt-4 space-y-2 text-sm text-gray-500">
                {business.address && (
                  <div className="flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {[business.address, business.city, business.state, business.zip_code]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {business.phone}
                  </div>
                )}
                {business.website && (
                  <div className="flex items-center">
                    <GlobeAltIcon className="h-4 w-4 mr-2" />
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {business.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {[
            { num: 1, label: 'Select Service' },
            { num: 2, label: 'Choose Time' },
            { num: 3, label: 'Confirm' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              {i > 0 && <div className="w-12 h-0.5 bg-gray-200 -mx-2" />}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= s.num
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s.num ? <CheckCircleIcon className="h-5 w-5" /> : s.num}
              </div>
              <span
                className={`ml-2 text-sm ${
                  step >= s.num ? 'text-indigo-600 font-medium' : 'text-gray-500'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Step 1: Services */}
          {step === 1 && (
            <Card>
              <Card.Header>
                <h2 className="text-lg font-semibold">Select a Service</h2>
              </Card.Header>
              <Card.Body className="p-0">
                {services.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No services available
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{service.name}</h3>
                            {service.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {service.description}
                              </p>
                            )}
                            <div className="flex items-center mt-2 text-sm text-gray-500 space-x-4">
                              <span className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {service.duration_minutes} min
                              </span>
                              <span className="flex items-center">
                                <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                                ${service.price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <span className="text-indigo-600">Select →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-6">
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Select a Date</h2>
                    <button
                      onClick={() => setStep(1)}
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      ← Back to services
                    </button>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {availableDates.map((date) => (
                      <button
                        key={date.toISOString()}
                        onClick={() => handleDateSelect(date)}
                        className={`p-2 text-center rounded-lg border transition-colors ${
                          selectedDate?.toDateString() === date.toDateString()
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="text-xs text-gray-500">
                          {format(date, 'EEE')}
                        </div>
                        <div className="font-medium">{format(date, 'd')}</div>
                        <div className="text-xs text-gray-500">
                          {format(date, 'MMM')}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card.Body>
              </Card>

              {selectedDate && (
                <Card>
                  <Card.Header>
                    <h2 className="text-lg font-semibold">
                      Available Times for {format(selectedDate, 'EEEE, MMMM d')}
                    </h2>
                  </Card.Header>
                  <Card.Body>
                    {slotsLoading ? (
                      <Loading />
                    ) : availableSlots.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">
                        No available slots for this date
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.start_time}
                            onClick={() => handleSlotSelect(slot)}
                            className={`p-2 text-center rounded-lg border transition-colors ${
                              selectedSlot?.start_time === slot.start_time
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            {format(parseISO(slot.start_time), 'h:mm a')}
                          </button>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Confirm Your Booking</h2>
                  <button
                    onClick={() => setStep(2)}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    ← Change time
                  </button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes for the business (optional)
                    </label>
                    <textarea
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Any special requests or notes..."
                    />
                  </div>
                  
                  <Button
                    onClick={handleBooking}
                    loading={booking}
                    size="lg"
                    className="w-full"
                  >
                    {isAuthenticated ? 'Confirm Booking' : 'Sign in to Book'}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Sidebar - Booking Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <Card.Header>
              <h3 className="font-semibold">Booking Summary</h3>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Business</p>
                <p className="font-medium">{business.name}</p>
              </div>
              
              {selectedService && (
                <div>
                  <p className="text-sm text-gray-500">Service</p>
                  <p className="font-medium">{selectedService.name}</p>
                  <div className="flex items-center mt-1 text-sm text-gray-500 space-x-3">
                    <span>{selectedService.duration_minutes} min</span>
                    <span>${selectedService.price.toFixed(2)}</span>
                  </div>
                </div>
              )}
              
              {selectedDate && (
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              )}
              
              {selectedSlot && (
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">
                    {format(parseISO(selectedSlot.start_time), 'h:mm a')} -{' '}
                    {format(parseISO(selectedSlot.end_time), 'h:mm a')}
                  </p>
                </div>
              )}
              
              {selectedService && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-lg">
                      ${selectedService.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BusinessDetailPage;
