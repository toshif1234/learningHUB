import api from './axios';

export const analyticsAPI = {
  overview: () => api.get('/analytics/overview'),
  courses: () => api.get('/analytics/courses'),
  users: () => api.get('/analytics/users'),
  exportResults: () => api.get('/analytics/export/results', { responseType: 'blob' }),
};
