import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginFormSchema } from '../../schemas/auth.schema';
import { useAuth } from '../../hooks/useAuth';
import { AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginUser, isLoading, error, mfaRequiredEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect back to the originally requested route (e.g. terminal verification with token) or default to dashboard
  const from = location.state?.from
    ? (typeof location.state.from === 'string'
        ? location.state.from
        : `${location.state.from.pathname || '/dashboard'}${location.state.from.search || ''}`)
    : '/dashboard';

  // Captcha state
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      mfaToken: '',
    },
  });

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput('');

    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas with light background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw random lines
      for (let i = 0; i < 15; i++) {
        ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, 0.25)`;
        ctx.lineWidth = Math.random() * 1.5 + 1;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
      }

      // Draw random dots
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, 0.3)`;
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw captcha letters with random skew, tilt, and size
      ctx.font = '28px "Outfit", sans-serif';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < code.length; i++) {
        ctx.fillStyle = `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, 1)`;
        const x = 15 + i * 28 + Math.random() * 4;
        const y = canvas.height / 2 + (Math.random() * 10 - 5);
        const angle = (Math.random() * 30 - 15) * Math.PI / 180;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillText(code[i], 0, 0);
        ctx.restore();
      }
    }, 50);
  };

  useEffect(() => {
    if (!mfaRequiredEmail) {
      generateCaptcha();
    }
  }, [mfaRequiredEmail]);

  const onSubmit = async (data: any) => {
    setLocalError(null);

    // Captcha validation
    if (!mfaRequiredEmail) {
      if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
        setLocalError('Incorrect CAPTCHA challenge text. Please try again.');
        generateCaptcha();
        return;
      }
    }

    const result = await loginUser({
      email: mfaRequiredEmail || data.email,
      password: data.password,
      mfaToken: data.mfaToken || undefined,
    });

    if (result.success) {
      navigate(from, { replace: true });
    } else if (!result.mfaRequired) {
      setLocalError(result.error || 'Login failed');
      if (!mfaRequiredEmail) {
        generateCaptcha();
      }
    }
  };

  return (
    <div className="auth-form-container">
      <h3>{mfaRequiredEmail ? 'Multi-Factor Verification' : 'Sign In'}</h3>
      
      {(error || localError) && (
        <div className="alert-message error" style={{ borderRadius: '20px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <p>{localError || error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        {!mfaRequiredEmail ? (
          <>
            <div className="form-group">
              <input
                id="email"
                type="email"
                placeholder="SGSITS Email / Username"
                className={errors.email ? 'input-error' : ''}
                {...register('email')}
              />
              {errors.email && <span className="error-text">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <input
                id="password"
                type="password"
                placeholder="Password"
                className={errors.password ? 'input-error' : ''}
                {...register('password')}
              />
              {errors.password && <span className="error-text">{errors.password.message}</span>}
            </div>

            <div className="remember-checkbox-group">
              <input type="checkbox" id="rememberMe" />
              <label htmlFor="rememberMe">Remember me on this device</label>
            </div>

            {/* Captcha Section */}
            <div className="captcha-container">
              <div className="captcha-canvas-wrapper">
                <canvas
                  ref={canvasRef}
                  width={200}
                  height={55}
                  className="captcha-canvas"
                  onClick={generateCaptcha}
                  title="Click to refresh CAPTCHA"
                />
                <button
                  type="button"
                  className="captcha-refresh-btn"
                  onClick={generateCaptcha}
                >
                  Refresh
                </button>
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Enter the text in the image"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  required
                />
              </div>
            </div>
          </>
        ) : (
          <div className="form-group">
            <label htmlFor="mfaToken" style={{ color: '#aaaaaa' }}>Authenticator OTP Code</label>
            <input
              id="mfaToken"
              type="text"
              placeholder="123456"
              maxLength={6}
              className={errors.mfaToken ? 'input-error' : ''}
              {...register('mfaToken')}
            />
            {errors.mfaToken && <span className="error-text">{errors.mfaToken.message}</span>}
          </div>
        )}

        <button type="submit" disabled={isLoading} className="btn-primary-pill">
          {isLoading ? 'Processing...' : mfaRequiredEmail ? 'Verify & Authenticate' : 'Login'}
        </button>
      </form>

      {!mfaRequiredEmail && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <Link to="/forgot-password">Forgot Password?</Link>
          <span style={{ color: '#888888' }}>
            Don't have an account? <Link to="/register">Register here</Link>
          </span>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
