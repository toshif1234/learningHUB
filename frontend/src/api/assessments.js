import api from './axios';

export const assessmentsAPI = {
  create: (data) => api.post('/assessments/', data),
  getForCourse: (courseId) => api.get(`/assessments/course/${courseId}`),
  update: (id, data) => api.put(`/assessments/${id}`, data),
  start: (id) => api.post(`/assessments/${id}/start`),
  submit: (attemptId, data) => api.post(`/assessments/attempts/${attemptId}/submit`, data),
  getAttemptDetail: (attemptId) => api.get(`/assessments/attempts/${attemptId}`),
  getResults: (id) => api.get(`/assessments/${id}/results`),
  getCertificate: (attemptId) => api.get(`/assessments/attempts/${attemptId}/certificate`),
  getPassedAttempt: (courseId) => api.get(`/assessments/course/${courseId}/passed-attempt`),
};
