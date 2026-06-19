import api from './axios';

export const coursesAPI = {
  create: (data) => api.post('/courses/', data),
  list: (params) => api.get('/courses/', { params }),
  get: (id) => api.get(`/courses/${id}`),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  uploadThumbnail: (id, formData) => api.post(`/courses/${id}/thumbnail`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadFile: (id, formData, onProgress) => api.post(`/courses/${id}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: onProgress }),
  addModule: (id, data) => api.post(`/courses/${id}/modules`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateModule: (id, mid, data) => api.put(`/courses/${id}/modules/${mid}`, data),
  deleteModule: (id, mid) => api.delete(`/courses/${id}/modules/${mid}`),
};
