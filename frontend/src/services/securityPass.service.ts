import api from './api';

export const createSecurityPass = async (formData: FormData) => {
  const response = await api.post('/security-pass', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getApprovers = async () => {
  const response = await api.get('/security-pass/approvers');
  return response.data;
};

export const listSecurityPasses = async (params: any = {}) => {
  const response = await api.get('/security-pass', { params });
  return response.data;
};

export const respondToSecurityPass = async (token: string) => {
  const response = await api.get('/security-pass/respond', { params: { token } });
  return response.data;
};

export default {
  createSecurityPass,
  getApprovers,
  listSecurityPasses,
  respondToSecurityPass,
};
