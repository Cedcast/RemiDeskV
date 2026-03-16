import axios from 'axios';

// Use environment variable or default to relative /api path
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

// Client API
export const clientAPI = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
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
};

// Analytics API
export const analyticsAPI = {
  getStats: (businessId) =>
    api.get('/analytics/stats', { params: businessId ? { business_id: businessId } : {} }),
};

// Availability API
export const availabilityAPI = {
  getByBusiness: (businessId, params) =>
    api.get(`/availability/business/${businessId}`, { params }),
  getSlots: (businessId, params) =>
    api.get(`/availability/slots/${businessId}`, { params }),
};

export default api;
