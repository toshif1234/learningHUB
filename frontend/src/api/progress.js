import api from './axios';

export const progressAPI = {
  completeModule: (moduleId) => api.post(`/progress/modules/${moduleId}/complete`),
  getCourseProgress: (courseId) => api.get(`/progress/courses/${courseId}`),
};
