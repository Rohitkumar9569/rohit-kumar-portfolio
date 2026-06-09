import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import API from '../api';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { useAuth } from '../context/AuthContext';
import { brandLogos } from '../assets';
import { envGoogleClientId, loadGoogleScript } from '../utils/googleSignIn';

const getTokenRole = (token: string): 'admin' | 'user' | null => {
  try {
    const base64Url = token.split('.')[1] || '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(window.atob(padded));
    return payload.role === 'admin' ? 'admin' : payload.role === 'user' ? 'user' : null;
  } catch {
    return null;
  }
};

const LoginPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(envGoogleClientId);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const completeStudentLogin = (token: string) => {
    const role = getTokenRole(token);
    if (role === 'admin') {
      setError('Admin accounts must use the admin login page.');
      return;
    }

    if (role !== 'user') {
      setError('This account cannot sign in from the student page.');
      return;
    }

    login(token);
    navigate('/app', { replace: true });
  };

  useEffect(() => {
    if (envGoogleClientId) return;

    let cancelled = false;

    API.get<{ clientId?: string }>('/api/auth/google/config')
      .then(({ data }) => {
        if (cancelled) return;
        setGoogleClientId(data.clientId || '');
      })
      .catch(() => {
        if (!cancelled) setGoogleClientId('');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

        googleButtonRef.current.innerHTML = '';
        setGoogleButtonReady(false);
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) {
              setError('Google sign-in did not return a credential.');
              return;
            }

            setGoogleLoading(true);
            setError('');
            try {
              const { data } = await API.post('/api/auth/google', {
                credential: response.credential,
                portal: 'student',
              });
              completeStudentLogin(data.token);
            } catch (err: any) {
              setError(err?.response?.data?.message || 'Google sign-in failed.');
            } finally {
              setGoogleLoading(false);
            }
          },
        });

        const buttonWidth = Math.min(360, Math.max(280, googleButtonRef.current.clientWidth || 360));
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          width: buttonWidth,
        });
        setGoogleButtonReady(true);
      })
      .catch(() => setError('Google sign-in could not load.'));

    return () => {
      cancelled = true;
    };
  }, [googleClientId, mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/student/register' : '/api/auth/login';
      const payload = mode === 'signup'
        ? { name, email, password }
        : { email, password, portal: 'student' };

      const { data } = await API.post(endpoint, payload);
      completeStudentLogin(data.token);
    } catch (err: any) {
      const fallback = mode === 'signup'
        ? 'Could not create account. Please try again.'
        : 'Invalid email or password. Please try again.';
      setError(err?.response?.data?.message || fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="study-shell study-login-page relative h-dvh overflow-hidden px-3 py-3 text-slate-950 dark:text-white sm:flex sm:items-center sm:justify-center">
      <div className="relative mx-auto flex h-full w-full max-w-[27rem] flex-col justify-center sm:h-auto">
        <header className="absolute inset-x-0 top-0 flex shrink-0 items-center justify-between gap-4 px-1 py-1.5 sm:-top-14">
          <Link to="/app" className="group inline-flex items-center text-xl font-black tracking-tight sm:text-2xl">
            <span>
              <span className="text-slate-900 dark:text-white">Study</span>
              <span className="text-cyan-600 dark:text-cyan-300">Hub</span>
            </span>
          </Link>
          <ThemeToggleButton />
        </header>

        <section className="study-login-card study-panel-surface flex min-h-0 flex-col justify-center rounded-[2rem] bg-white/76 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)] ring-1 ring-white/80 backdrop-blur-xl dark:ring-white/5 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-200">
                Student Access
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[rgb(var(--study-text))] sm:text-3xl">
                {mode === 'signup' ? 'Create account' : 'Welcome back'}
              </h1>
            </div>
            <div className="study-control-surface flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-cyan-700 dark:text-cyan-100">
              <LockClosedIcon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-2xl bg-black/[0.035] p-1 dark:bg-white/[0.035]">
            {(['login', 'signup'] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => {
                  setMode(nextMode);
                  setError('');
                }}
                className={[
                  'min-h-10 rounded-xl text-sm font-black transition',
                  mode === nextMode
                    ? 'study-primary-action shadow-sm'
                    : 'text-[rgb(var(--study-muted))] hover:text-[rgb(var(--study-text))]',
                ].join(' ')}
              >
                {nextMode === 'login' ? 'Login' : 'Create'}
              </button>
            ))}
          </div>

          {googleClientId ? (
            <div className="relative min-h-12 overflow-hidden rounded-2xl">
              <button
                type="button"
                disabled={!googleButtonReady || googleLoading}
                className="study-google-button study-input-surface flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 text-sm font-black text-[rgb(var(--study-text))] shadow-[0_10px_26px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-80 dark:bg-white/[0.06]"
              >
                <img src={brandLogos.google} alt="" className="h-5 w-5" />
                <span>{googleLoading ? 'Connecting Google...' : mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
              </button>
              <div
                ref={googleButtonRef}
                className={[
                  'absolute inset-0 z-20 flex items-center justify-center overflow-hidden opacity-0',
                  googleButtonReady && !googleLoading ? 'pointer-events-auto' : 'pointer-events-none',
                ].join(' ')}
                aria-hidden="true"
              />
            </div>
          ) : null}

          {googleClientId ? (
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">or email</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            </div>
          ) : null}

          <form className="space-y-2.5" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</span>
                <span className="study-input-surface mt-1.5 flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm transition focus-within:ring-4 focus-within:ring-cyan-500/10">
                  <UserIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                    placeholder="Your name"
                  />
                </span>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</span>
              <span className="study-input-surface mt-1.5 flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm transition focus-within:ring-4 focus-within:ring-cyan-500/10">
                <EnvelopeIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  placeholder="you@example.com"
                />
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Password</span>
              <span className="study-input-surface mt-1.5 flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm transition focus-within:ring-4 focus-within:ring-cyan-500/10">
                <LockClosedIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  placeholder="8+ characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>

            {mode === 'signup' && (
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Confirm password</span>
                <span className="study-input-surface mt-1.5 flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm transition focus-within:ring-4 focus-within:ring-cyan-500/10">
                  <LockClosedIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                    placeholder="Repeat password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </span>
              </label>
            )}

            {error && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-sm font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="study-login-submit inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 text-sm font-black text-white shadow-[0_18px_38px_rgba(244,63,94,0.26)] transition hover:-translate-y-0.5 hover:bg-rose-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-300 dark:text-[rgb(var(--study-bg))] dark:hover:bg-rose-200"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Login'}
              {!loading && <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>

          <div className="study-card-surface mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup');
                setError('');
              }}
              className="font-black text-cyan-700 hover:text-cyan-600 dark:text-cyan-300"
            >
              {mode === 'signup' ? 'Log in' : 'Create account'}
            </button>
          </div>

        </section>
      </div>
    </div>
  );
};

export default LoginPage;
