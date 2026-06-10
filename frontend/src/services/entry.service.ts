import api from './api';

export const verifyQR = async (data: { qrToken: string; gate: string }) => {
  const response = await api.post('/entry/verify', data);
  return response.data;
};

export const manualOverride = async (data: {
  passId: string;
  gate: string;
  logType: 'ENTRY' | 'EXIT';
  overrideReason: string;
}) => {
  const response = await api.post('/entry/override', data);
  return response.data;
};

export const listLogs = async (params: any = {}) => {
  const response = await api.get('/entry', { params });
  return response.data;
};

export default {
  verifyQR,
  manualOverride,
  listLogs,
};
