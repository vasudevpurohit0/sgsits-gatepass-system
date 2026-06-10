import api from './api';

export const createPass = async (formData: FormData) => {
  const response = await api.post('/pass', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getPass = async (id: string) => {
  const response = await api.get(`/pass/${id}`);
  return response.data;
};

export const listPasses = async (params: any = {}) => {
  const response = await api.get('/pass', { params });
  return response.data;
};

export const reviewPass = async (id: string, data: { approved: boolean; remarks?: string }) => {
  const response = await api.post(`/pass/${id}/review`, data);
  return response.data;
};

export const revokePass = async (id: string, data: { reason: string }) => {
  const response = await api.post(`/pass/${id}/revoke`, data);
  return response.data;
};

export default {
  createPass,
  getPass,
  listPasses,
  reviewPass,
  revokePass,
};
