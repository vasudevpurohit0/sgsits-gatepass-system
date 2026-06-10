import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import { setLoading, setCredentials, clearCredentials, setError, setMfaRequired } from '../redux/slices/authSlice';
import * as authApi from '../services/auth.service';
import * as userService from '../services/user.service';

/**
 * Custom React hook wrapping authentication operations
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);

  /**
   * Verify session integrity on application boot
   */
  const checkAuthSession = async () => {
    dispatch(setLoading(true));
    try {
      const response = await userService.getUserProfile();
      const user = response.data;
      const accessToken = localStorage.getItem('accessToken') || '';
      dispatch(setCredentials({ user, accessToken }));
    } catch (err) {
      localStorage.removeItem('accessToken');
      dispatch(clearCredentials());
    } finally {
      dispatch(setLoading(false));
    }
  };

  /**
   * Log in user using credentials, handling MFA validation prompt triggers
   */
  const loginUser = async (credentials: any) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await authApi.login(credentials);
      const { accessToken, user } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      dispatch(setCredentials({ user, accessToken }));
      return { success: true };
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message || 'Login failed';
      
      if (status === 428) {
        // MFA validation required
        dispatch(setMfaRequired(credentials.email));
        return { success: false, mfaRequired: true };
      }
      
      dispatch(setError(message));
      dispatch(setLoading(false));
      return { success: false, error: message };
    }
  };

  /**
   * Request user registration
   */
  const registerUser = async (userData: any) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await authApi.register(userData);
      dispatch(setLoading(false));
      return { success: true, message: response.message };
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      dispatch(setError(message));
      dispatch(setLoading(false));
      return { success: false, error: message };
    }
  };

  /**
   * Log out user, invoke backend invalidation, and purge local states
   */
  const logoutUser = async () => {
    dispatch(setLoading(true));
    try {
      await authApi.logout();
    } catch (err) {
      // Proceed with local logout regardless of network errors
    } finally {
      localStorage.removeItem('accessToken');
      dispatch(clearCredentials());
      dispatch(setLoading(false));
    }
  };

  return {
    ...authState,
    checkAuthSession,
    loginUser,
    registerUser,
    logoutUser,
  };
};

export default useAuth;
