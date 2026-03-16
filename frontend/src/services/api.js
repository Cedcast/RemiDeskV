import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/token', credentials),
  getCurrentUser: () => api.get('/auth/me'),
};

// Business API
export const businessAPI = {
  list: (params) => api.get('/businesses', { params }),
  get: (id) => api.get(`/businesses/${id}`),
  create: (data) => api.post('/businesses', data),
  update: (id, data) => api.put(`/businesses/${id}`, data),
  delete: (id) => api.delete(`/businesses/${id}`),
  getMyBusinesses: () => api.get('/businesses/my'),
};

// Service API
export const serviceAPI = {
  getByBusiness: (businessId) => api.get(`/services/business/${businessId}`),
  get: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

// Availability API
export const availabilityAPI = {
  getSchedules: (businessId) => api.get(`/availability/schedules/${businessId}`),
  createSchedule: (data) => api.post('/availability/schedules', data),
  updateSchedule: (id, data) => api.put(`/availability/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/availability/schedules/${id}`),
  getSlots: (businessId, serviceId, date) => 
    api.get(`/availability/slots/${businessId}`, { params: { service_id: serviceId, date } }),
};

// Appointment API
export const appointmentAPI = {
  list: (params) => api.get('/appointments', { params }),
  get: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  updateStatus: (id, data) => api.patch(`/appointments/${id}/status`, data),
  cancel: (id) => api.delete(`/appointments/${id}`),
  getUpcoming: (limit = 10) => api.get('/appointments/upcoming', { params: { limit } }),
  getDashboardStats: (businessId) => 
    api.get('/appointments/dashboard/stats', { params: { business_id: businessId } }),
};

export default api;
