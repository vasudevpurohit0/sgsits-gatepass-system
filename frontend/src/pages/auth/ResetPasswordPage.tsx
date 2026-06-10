import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPasswordFormSchema, resetPasswordFormSchema } from '../../schemas/auth.schema';
import * as authApi from '../../services/auth.service';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'forgot' | 'reset'>('forgot');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  // Form for Forgot Password (Request OTP)
  const forgotForm = useForm({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });

  // Form for Reset Password (Submit OTP + New Password)
  const resetForm = useForm({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { email: '', token: '', newPassword: '', confirmNewPassword: '' },
  });

  const onForgotSubmit = async (data: { email: string }) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authApi.forgotPassword(data.email);
      setUserEmail(data.email);
      resetForm.setValue('email', data.email);
      setSuccess('If your email is registered, a 6-digit OTP code has been sent.');
      setStep('reset');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: any) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authApi.resetPassword({
        email: data.email,
        token: data.token,
        newPassword: data.newPassword,
      });
      setSuccess('Password successfully reset! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h3>{step === 'forgot' ? 'Forgot Password?' : 'Reset Password'}</h3>
      <p className="auth-subtitle">
        {step === 'forgot'
          ? 'Enter your registered email and we will send you an OTP to reset your password.'
          : `We sent a 6-digit OTP code to ${userEmail}. Enter the code and choose a new password.`}
      </p>

      {error && (
        <div className="alert-message error" style={{ borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {success && (
        <div className="alert-message success" style={{ borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0 }}>{success}</p>
        </div>
      )}

      {step === 'forgot' ? (
        <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">University Email</label>
            <input
              id="email"
              type="email"
              placeholder="john.doe@university.edu"
              className={forgotForm.formState.errors.email ? 'input-error' : ''}
              {...forgotForm.register('email')}
            />
            {forgotForm.formState.errors.email && (
              <span className="error-text">{forgotForm.formState.errors.email.message}</span>
            )}
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-primary btn-large w-full">
            {isLoading ? 'Sending...' : 'Request OTP Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="auth-form">
          <div className="form-group">
            <label htmlFor="reset-email">Email Address</label>
            <input
              id="reset-email"
              type="email"
              readOnly
              className="input-readonly"
              {...resetForm.register('email')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="token">OTP Code</label>
            <input
              id="token"
              type="text"
              placeholder="123456"
              maxLength={6}
              className={resetForm.formState.errors.token ? 'input-error' : ''}
              {...resetForm.register('token')}
            />
            {resetForm.formState.errors.token && (
              <span className="error-text">{resetForm.formState.errors.token.message}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                className={resetForm.formState.errors.newPassword ? 'input-error' : ''}
                {...resetForm.register('newPassword')}
              />
              {resetForm.formState.errors.newPassword && (
                <span className="error-text">{resetForm.formState.errors.newPassword.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmNewPassword">Confirm New Password</label>
              <input
                id="confirmNewPassword"
                type="password"
                placeholder="••••••••"
                className={resetForm.formState.errors.confirmNewPassword ? 'input-error' : ''}
                {...resetForm.register('confirmNewPassword')}
              />
              {resetForm.formState.errors.confirmNewPassword && (
                <span className="error-text">{resetForm.formState.errors.confirmNewPassword.message}</span>
              )}
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-primary btn-large w-full mt-2">
            {isLoading ? 'Resetting...' : 'Change Password'}
          </button>

          <button
            type="button"
            className="btn btn-secondary w-full mt-2"
            onClick={() => setStep('forgot')}
            disabled={isLoading}
          >
            Back to Email Request
          </button>
        </form>
      )}

      <p className="auth-footer-text">
        Remember your password? <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>Login here</Link>
      </p>
    </div>
  );
};

export default ResetPasswordPage;
