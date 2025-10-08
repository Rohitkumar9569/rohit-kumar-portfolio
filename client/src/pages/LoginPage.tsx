// File: client/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const LoginPage: React.FC = () => {
  // State for form inputs, loading, and errors
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get the login function from our AuthContext
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call the login API endpoint we created on the backend
      const response = await API.post('/api/auth/login', { email, password });
      // If login is successful, call the login function from the context
      login(response.data.token);

      // Redirect the user to the admin dashboard
      navigate('/admin');

    } catch (err: any) {
      console.error('Login failed:', err);
      // Set a user-friendly error message
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      // FIX 1: Background consistent with other sections (light/dark mode)
      className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-background"
    >
      <div
        // FIX 2: Card background consistent with other theme cards
        className="w-full max-w-md p-8 space-y-8 
         bg-white dark:bg-slate-800 rounded-xl 
         shadow-2xl shadow-gray-400/50 dark:shadow-slate-900/50"
      >
        <div className="text-center">
          <div className='flex justify-center mb-4'>
            <Logo />
          </div>
          {/* FIX 3: Heading color consistent */}
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Login</h2>
          {/* FIX 4: Paragraph color consistent */}
          <p className="mt-2 text-gray-600 dark:text-slate-400">Access your dashboard</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            {/* FIX 5: Label color consistent */}
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                // FIX 6: Input styling matching the Contact form (raised/floating effect)
                className="w-full bg-gray-200/70 dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600 rounded-md py-2 px-3 
                  text-gray-800 dark:text-white shadow-md shadow-gray-400/30 dark:shadow-slate-900/40 
                  focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-200/70 dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600 rounded-md py-2 px-3 
                 text-gray-800 dark:text-white shadow-md shadow-gray-400/30 dark:shadow-slate-900/40 
                 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
              />
            </div>
          </div>

          {/* FIX 7: Error color consistent */}
          {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              // FIX 8: Button styling matching the theme's primary button (cyan accent)
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white 
             bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-700 dark:hover:bg-cyan-600 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 
             disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;