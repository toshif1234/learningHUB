import api from './axios';

export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  list: (params) => api.get('/users/', { params }),
  updateRole: (id, data) => api.put(`/users/${id}/role`, data),
  updateStatus: (id, data) => api.put(`/users/${id}/status`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};
