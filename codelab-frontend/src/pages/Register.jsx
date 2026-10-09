import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, ShieldCheck, Zap, BarChart3, Code2, GitBranch } from 'lucide-react';

const FEATURES = [
  { icon: Code2,       text: 'AI-powered code analysis engine' },
  { icon: ShieldCheck, text: 'Security vulnerability detection' },
  { icon: Zap,         text: 'Auto code repair & suggestions' },
  { icon: BarChart3,   text: 'Issue prioritization & tracking' },
  { icon: GitBranch,   text: 'Multi-language project support' },
];

// Password strength
const getPasswordStrength = (pw) => {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: 'var(--error)' };
  if (score === 2) return { level: 2, label: 'Fair', color: 'var(--warning)' };
  if (score === 3) return { level: 3, label: 'Good', color: '#3B82F6' };
  return { level: 4, label: 'Strong', color: 'var(--success)' };
};

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.confirmPassword);
      toast.success('Welcome to CodeLab! 🚀');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      toast.success('Welcome to CodeLab! 🚀');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google registration failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google registration was unsuccessful. Please try again.');
  };

  return (
    <div className="auth-page">
      {/* ── Left Visual Panel ── */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-brand">
            <div className="auth-brand-icon" aria-hidden="true">CL</div>
            <span className="auth-brand-name">CodeLab</span>
          </div>

          <h1 className="auth-headline">
            Your AI code<br />
            <span>intelligence hub</span>
          </h1>
          <p className="auth-subheadline">
            Join thousands of developers who use CodeLab to
            analyze, prioritize, and automatically repair code issues.
          </p>

          <ul className="auth-feature-list" role="list">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <li key={i} className="auth-feature-item">
                <div className="auth-feature-check" aria-hidden="true">
                  <Icon size={11} />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* Stats strip */}
          <div
            style={{
              marginTop: 36,
              display: 'flex',
              gap: 24,
              padding: '16px 20px',
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {[
              { val: '10+', label: 'Languages' },
              { val: '100%', label: 'Free to try' },
              { val: 'GPT-4', label: 'Powered AI' },
            ].map(({ val, label }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--primary)', letterSpacing: '-0.5px' }}>{val}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="auth-right">
        <div className="auth-form-container" style={{ animation: 'fadeUp 0.4s ease' }}>
          <h1 className="auth-form-title">Create your account</h1>
          <p className="auth-form-subtitle">Start analyzing code with AI — free forever</p>

          {/* Google Sign-up */}
          <div
            style={{
              opacity: googleLoading ? 0.6 : 1,
              pointerEvents: googleLoading ? 'none' : 'auto',
              transition: 'opacity 0.2s',
            }}
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              width="100%"
              text="continue_with"
              shape="rectangular"
              logo_alignment="left"
            />
          </div>

          {/* Divider */}
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <div className="auth-divider-line" />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                className="form-input"
                name="name"
                type="text"
                placeholder="Jane Smith"
                value={form.name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                className="form-input"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  className="form-input"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password strength indicator */}
              {form.password && (
                <>
                  <div className="pw-strength-bar" role="progressbar" aria-label={`Password strength: ${strength.label}`} aria-valuenow={strength.level} aria-valuemin={0} aria-valuemax={4}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`pw-strength-segment ${
                          i <= strength.level
                            ? strength.level === 1 ? 'active-weak'
                            : strength.level === 2 ? 'active-fair'
                            : strength.level === 3 ? 'active-good'
                            : 'active-strong'
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                  <p className="pw-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm-password">Confirm password</label>
              <input
                id="reg-confirm-password"
                className={`form-input ${form.confirmPassword && form.password !== form.confirmPassword ? 'error' : ''}`}
                name="confirmPassword"
                type="password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="form-error">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading || !form.name || !form.email || !form.password}
              style={{ marginTop: '4px', borderRadius: 'var(--radius-sm)', height: 44 }}
              aria-label={loading ? 'Creating account...' : 'Create Account'}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" aria-hidden="true" />
                  Creating account...
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: '22px',
            fontSize: '0.8375rem',
            color: 'var(--text-muted)',
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600, color: 'var(--primary)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
