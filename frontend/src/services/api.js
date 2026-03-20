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

      // In production, force a redirect to the login page on 401.
      // In local development, avoid an automatic redirect so that
      // you can see the actual error on the dashboard instead of
      // being kicked back to the login screen.
      if (import.meta.env.PROD) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
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

// Billing / Subscriptions API
export const billingAPI = {
  getPricing: (currency = 'USD') => api.get('/subscriptions/pricing', { params: { currency } }),
  getCurrencies: () => api.get('/subscriptions/pricing/currencies'),
  startTrial: (data) => api.post('/subscriptions/trial', data),
  getCurrent: () => api.get('/subscriptions/current'),
  upgrade: (data) => api.post('/subscriptions/upgrade', data),
  cancel: (data) => api.post('/subscriptions/cancel', data),
  getPayments: () => api.get('/subscriptions/payments'),
};

// Reschedule Portal API (public, no auth required)
export const rescheduleAPI = {
  getInfo: (token) => api.get(`/reschedule/${token}`),
  submit: (token, data) => api.post(`/reschedule/${token}`, data),
};

export default api;

// Admin API (superadmin only)
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getGrowthStats: () => api.get('/admin/stats/growth'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  banUser: (id, data) => api.patch(`/admin/users/${id}/ban`, data),
  unbanUser: (id) => api.patch(`/admin/users/${id}/unban`),
  getBusinesses: (params) => api.get('/admin/businesses', { params }),
  getBusiness: (id) => api.get(`/admin/businesses/${id}`),
  updateBusiness: (id, data) => api.put(`/admin/businesses/${id}`, data),
  deleteBusiness: (id) => api.delete(`/admin/businesses/${id}`),
  suspendBusiness: (id, data) => api.patch(`/admin/businesses/${id}/suspend`, data),
  reinstateBusiness: (id) => api.patch(`/admin/businesses/${id}/reinstate`),
  getSubscriptions: (params) => api.get('/admin/subscriptions', { params }),
  getSubscriptionSummary: () => api.get('/admin/subscriptions/summary'),
  getPayments: (params) => api.get('/admin/payments', { params }),
  getRevenue: () => api.get('/admin/payments/revenue'),
  getNotifications: (params) => api.get('/admin/notifications', { params }),
  getNotificationStats: () => api.get('/admin/notifications/stats'),
  getNotificationFailures: (params) => api.get('/admin/notifications/failures', { params }),
  getAuditLog: (params) => api.get('/admin/audit-log', { params }),
};
