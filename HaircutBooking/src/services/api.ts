import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  ownerLogin: (email: string, password: string) =>
    api.post('/owners/login', { email, password }),
  ownerRegister: (data: any) =>
    api.post('/owners/register', data),
};

export const servicesAPI = {
  getServicesByOwner: (ownerId: string) =>
    api.get(`/services/owner/${ownerId}`),
  createService: (data: any) =>
    api.post('/services', data),
  updateService: (id: string, data: any) =>
    api.put(`/services/${id}`, data),
  deleteService: (id: string) =>
    api.delete(`/services/${id}`),
  seedDefaultServices: (ownerId: string) =>
    api.post(`/services/seed-defaults/${ownerId}`),
};

export const appointmentsAPI = {
  getAvailableSlots: (ownerId: string, serviceId: string, date: string) =>
    api.get('/appointments/available-slots', {
      params: { ownerId, serviceId, date },
    }),
  createAppointment: (data: any) =>
    api.post('/appointments', data),
  getOwnerAppointments: (ownerId: string, params?: any) =>
    api.get(`/appointments/owner/${ownerId}`, { params }),
  getCustomerAppointments: (customerId: string) =>
    api.get(`/appointments/customer/${customerId}`),
  updateAppointment: (id: string, data: any) =>
    api.put(`/appointments/${id}`, data),
  cancelAppointment: (id: string) =>
    api.delete(`/appointments/${id}`),
};

export const customersAPI = {
  createCustomer: (data: any) =>
    api.post('/customers/register', data),
  getCustomer: (id: string) =>
    api.get(`/customers/${id}`),
  updateCustomer: (id: string, data: any) =>
    api.put(`/customers/${id}`, data),
};

export const ownersAPI = {
  getProfile: () =>
    api.get('/owners/profile'),
  updateProfile: (data: any) =>
    api.put('/owners/profile', data),
  updateStoreHours: (storeHours: any) =>
    api.put('/owners/store-hours', { storeHours }),
  updateCancellationPolicy: (cancellationNoticeHours: number) =>
    api.put('/owners/cancellation-policy', { cancellationNoticeHours }),
};

export default api;