import api from './api';

export const registerVisitor = async (formData: FormData) => {
  const response = await api.post('/visitor', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const listVisitors = async (params: any = {}) => {
  const response = await api.get('/visitor', { params });
  return response.data;
};

export const getVisitor = async (id: string) => {
  const response = await api.get(`/visitor/${id}`);
  return response.data;
};

export const blacklistVisitor = async (id: string, data: { isBlacklisted: boolean; blacklistReason?: string }) => {
  const response = await api.post(`/visitor/${id}/blacklist`, {
    blacklisted: data.isBlacklisted,
    blacklistReason: data.blacklistReason,
  });
  return response.data;
};

export default {
  registerVisitor,
  listVisitors,
  getVisitor,
  blacklistVisitor,
};
