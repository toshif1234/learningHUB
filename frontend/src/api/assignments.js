import api from './axios';

export const assignmentsAPI = {
  create: (data) => api.post('/assignments/', data),
  list: (params) => api.get('/assignments/', { params }),
  get: (id) => api.get(`/assignments/${id}`),
  extendDeadline: (id, data) => api.put(`/assignments/${id}/deadline`, data),
  revoke: (id) => api.delete(`/assignments/${id}`),
  bulkAssign: (formData) => api.post('/assignments/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
