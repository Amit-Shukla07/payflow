import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isExpired = new URLSearchParams(location.search).get('expired') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide your email address and password');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
      showToast('Signed in successfully', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed:', err);
      const msg =
        err.response?.data?.error?.message ||
        (!err.response
          ? 'Cannot connect to backend server. Make sure the server is running.'
          : err.message || 'Invalid email or password combination');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 px-4 sm:px-6 select-none font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 sm:px-10 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          {/* Brand Logo */}
          <div className="text-center space-y-2">
            <Link to="/" className="inline-block">
              <span className="text-3xl font-black tracking-tight text-black">
                Pay<span className="text-[#0047BA]">Flow</span>
              </span>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Log in to your account
            </h1>
          </div>

          {isExpired && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              Session expired. Please log in again to continue.
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Logins Pill Box */}
          <div className="p-4 rounded-2xl bg-[#D6E6FE]/50 border border-blue-200/80 space-y-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#003087]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Demo Accounts</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('alice@example.com')}
                className="px-2 py-2 rounded-xl bg-white border border-blue-200 text-xs font-bold text-[#0047BA] hover:bg-blue-50 transition-colors truncate shadow-xs"
              >
                Alice (₹25k)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('bob@example.com')}
                className="px-2 py-2 rounded-xl bg-white border border-blue-200 text-xs font-bold text-[#0047BA] hover:bg-blue-50 transition-colors truncate shadow-xs"
              >
                Bob (₹15k)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('charlie@example.com')}
                className="px-2 py-2 rounded-xl bg-white border border-blue-200 text-xs font-bold text-[#0047BA] hover:bg-blue-50 transition-colors truncate shadow-xs"
              >
                Charlie (₹5k)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition-all"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Signing in...' : 'Log In'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-gray-100 text-center">
            <Link
              to="/register"
              className="w-full inline-block py-3 px-4 rounded-full border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-900 transition-colors"
            >
              Sign Up for PayFlow
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
