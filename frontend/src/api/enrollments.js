import api from './axios';

export const enrollmentsAPI = {
  enroll: (data) => api.post('/enrollments/', data),
  list: () => api.get('/enrollments/'),
  updateProgress: (id, data) => api.put(`/enrollments/${id}/progress`, data),
  unenroll: (id) => api.delete(`/enrollments/${id}`),
};
