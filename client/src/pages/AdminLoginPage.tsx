import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Logo from '../components/Logo';
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

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(envGoogleClientId);
  const [error, setError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) navigate('/admin', { replace: true });
  }, [isAdmin, navigate]);

  const completeAdminLogin = useCallback((token: string) => {
    if (getTokenRole(token) !== 'admin') {
      setError('Admin access only.');
      return;
    }

    login(token);
    navigate('/admin', { replace: true });
  }, [login, navigate]);

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
                portal: 'admin',
              });
              completeAdminLogin(data.token);
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
          text: 'continue_with',
          width: buttonWidth,
        });
        setGoogleButtonReady(true);
      })
      .catch(() => setError('Google sign-in could not load.'));

    return () => {
      cancelled = true;
    };
  }, [completeAdminLogin, googleClientId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/api/auth/login', { email, password, portal: 'admin' });
      completeAdminLogin(response.data.token);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Invalid admin credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-premium flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 text-white">
      <div className="admin-login-card w-full max-w-[22.5rem] rounded-[1.65rem] p-5 sm:max-w-md sm:p-8">
        <div className="text-center">
          <div className="mb-5 flex justify-center">
            <Logo />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8ee9f5]">Secure Access</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Study Hub Admin</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-[#b7bcb7]">
            Library, PDFs, publishing, and users.
          </p>
        </div>

        {googleClientId ? (
          <div className="relative mt-7 min-h-12 overflow-hidden rounded-2xl">
            <button
              type="button"
              disabled={!googleButtonReady || googleLoading}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/20 bg-[#f7f8f4] px-4 text-sm font-black text-[#111310] shadow-sm transition hover:bg-white disabled:cursor-wait disabled:opacity-80"
            >
              <img src={brandLogos.google} alt="" className="h-5 w-5" />
              <span>{googleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
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
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8f968f]">or password</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
        ) : null}

        <form className={googleClientId ? 'space-y-5' : 'mt-8 space-y-5'} onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-[#d8ddd8]">Admin email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#090b0a] px-3 py-3 text-white outline-none transition placeholder:text-[#777d77] focus:border-[#71d9f3]/60 focus:ring-4 focus:ring-[#71d9f3]/10"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-[#d8ddd8]">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#090b0a] px-3 py-3 text-white outline-none transition placeholder:text-[#777d77] focus:border-[#71d9f3]/60 focus:ring-4 focus:ring-[#71d9f3]/10"
            />
          </label>

          {error && <p className="rounded-2xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-center text-sm font-bold text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="site-primary-action w-full rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Open Control Center'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
