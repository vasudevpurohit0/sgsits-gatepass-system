import api from './api';

/**
 * Request authentication and retrieve session credentials
 */
export const login = async (credentials: any) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

/**
 * Request user self-registration
 */
export const register = async (userData: any) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

/**
 * Terminate user session and revoke refresh tokens
 */
export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

/**
 * Request password reset OTP
 */
export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Reset password using verification code
 */
export const resetPassword = async (data: any) => {
  const response = await api.post('/auth/reset-password', data);
  return response.data;
};

export default { login, register, logout, forgotPassword, resetPassword };
