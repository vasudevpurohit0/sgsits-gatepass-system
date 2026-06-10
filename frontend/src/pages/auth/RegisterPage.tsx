import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { registerFormSchema } from '../../schemas/auth.schema';
import { useAuth } from '../../hooks/useAuth';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerUser, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      universityId: '',
      role: 'STUDENT',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: any) => {
    setLocalError(null);
    setSuccessMessage(null);
    
    const result = await registerUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      universityId: data.universityId || undefined,
      role: data.role,
      password: data.password,
    });

    if (result.success) {
      setSuccessMessage(result.message || 'Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } else {
      setLocalError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-form-container register">
      <h3>Create Portal Account</h3>
      <p className="auth-subtitle">Register using your official university email credentials.</p>

      {(error || localError) && (
        <div className="alert-message error" style={{ borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0 }}>{localError || error}</p>
        </div>
      )}

      {successMessage && (
        <div className="alert-message success" style={{ borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0 }}>{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form scrollable">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              placeholder="John"
              className={errors.firstName ? 'input-error' : ''}
              {...register('firstName')}
            />
            {errors.firstName && <span className="error-text">{errors.firstName.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              placeholder="Doe"
              className={errors.lastName ? 'input-error' : ''}
              {...register('lastName')}
            />
            {errors.lastName && <span className="error-text">{errors.lastName.message}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">University Email</label>
          <input
            id="email"
            type="email"
            placeholder="john.doe@university.edu"
            className={errors.email ? 'input-error' : ''}
            {...register('email')}
          />
          {errors.email && <span className="error-text">{errors.email.message}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="text"
              placeholder="+919876543210"
              className={errors.phone ? 'input-error' : ''}
              {...register('phone')}
            />
            {errors.phone && <span className="error-text">{errors.phone.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="universityId">University Roll/ID</label>
            <input
              id="universityId"
              type="text"
              placeholder="STU2025001"
              className={errors.universityId ? 'input-error' : ''}
              {...register('universityId')}
            />
            {errors.universityId && <span className="error-text">{errors.universityId.message}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="role">Register As</label>
          <select id="role" {...register('role')} className="form-select">
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty Member</option>
          </select>
          {errors.role && <span className="error-text">{errors.role.message}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className={errors.password ? 'input-error' : ''}
              {...register('password')}
            />
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className={errors.confirmPassword ? 'input-error' : ''}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword.message}</span>}
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn btn-primary btn-large w-full mt-2">
          {isLoading ? 'Registering...' : 'Register Account'}
        </button>
      </form>

      <p className="auth-footer-text">
        Already have an account? <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>Login here</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
