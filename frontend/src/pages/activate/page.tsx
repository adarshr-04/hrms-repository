import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '@/lib/api';
import { Lock, Loader2, AlertCircle, Building2, CheckCircle2, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActivatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState<{ first_name: string; last_name: string; email: string } | null>(null);

  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const parseErrorMessage = (errorData: any, defaultMsg: string): string => {
    if (!errorData) return defaultMsg;
    if (typeof errorData === 'string') return errorData;
    if (Array.isArray(errorData)) return errorData[0] || defaultMsg;
    if (typeof errorData === 'object') {
      for (const key of ['error', 'message', 'detail', 'non_field_errors', 'password', 'token']) {
        if (errorData[key]) {
          const val = errorData[key];
          if (Array.isArray(val)) return val[0] || defaultMsg;
          if (typeof val === 'string') return val;
        }
      }
    }
    return defaultMsg;
  };

  useEffect(() => {
    if (!token) {
      setError('Activation token is missing. Please check your email link or contact your HR team.');
      setVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get(`/accounts/verify-invite/?token=${token}`);
        setEmployeeInfo({
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          email: response.data.email,
        });
        setTokenValid(true);
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          setError(parseErrorMessage(err.response?.data, 'This invitation link is invalid or has expired. Please contact HR to request a new invite.'));
        } else {
          setError('An unexpected error occurred during verification.');
        }
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/accounts/activate-account/', {
        token,
        password,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(parseErrorMessage(err.response?.data, 'Failed to activate account.'));
      } else {
        setError('An unexpected error occurred during activation.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', top: '-10%', right: '-5%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'pulse 4s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-5%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'pulse 5s ease-in-out infinite 1s'
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '460px', padding: '24px', position: 'relative', zIndex: 10 }}
      >
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '72px', height: '72px', borderRadius: '20px', marginBottom: '20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 20px 40px rgba(99,102,241,0.5)',
            }}
          >
            <Building2 size={36} color="white" />
          </motion.div>
          <h1 style={{
            fontSize: '28px', fontWeight: '800', color: 'white',
            letterSpacing: '-0.5px', marginBottom: '8px'
          }}>HRMS Enterprise</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Account Activation & Onboarding
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {verifying ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
              <p className="text-white font-medium text-lg">Verifying invitation link...</p>
              <p className="text-slate-400 text-sm mt-2">Checking token validity with server</p>
            </div>
          ) : success ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6">
                <CheckCircle2 size={36} className="text-emerald-400 animate-bounce" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Setup Successful!</h3>
              <p className="text-slate-300 text-sm mb-6">
                Welcome, {employeeInfo?.first_name}! Your password is set, and your account has been activated.
              </p>
              <p className="text-indigo-400 text-xs flex items-center gap-2 font-medium">
                <Loader2 size={12} className="animate-spin" /> Redirecting to Login...
              </p>
            </motion.div>
          ) : !tokenValid ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-6">
                <AlertCircle size={36} className="text-rose-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Invalid Invite Link</h3>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                {error || 'The activation token you provided is invalid or has expired.'}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="pb-4 border-b border-white/10">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Onboarding Profile</p>
                <h3 className="text-white font-bold text-lg">{employeeInfo?.first_name} {employeeInfo?.last_name}</h3>
                <p className="text-slate-300 text-sm mt-0.5">{employeeInfo?.email}</p>
              </div>

              {error && (
                <div className="flex items-center gap-3 bg-rose-500/15 border border-rose-500/30 rounded-xl p-4">
                  <AlertCircle size={18} className="text-rose-400 shrink-0" />
                  <p className="text-rose-400 text-xs font-medium leading-relaxed">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Create Account Password
                </label>
                <div className="relative">
                  <Lock size={17} className="text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-11 pr-11 py-3.5 bg-white/5 border border-white/12 rounded-xl text-white text-sm outline-none focus:border-indigo-500/70 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={17} className="text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-11 pr-11 py-3.5 bg-white/5 border border-white/12 rounded-xl text-white text-sm outline-none focus:border-indigo-500/70 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Completing Setup...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} /> Complete Onboarding <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>
          )}

          {/* Card Footer */}
          <div className="mt-6 pt-5 border-t border-white/8 text-center">
            <p className="text-white/30 text-[11px] uppercase tracking-wider font-semibold">
              🔒 Enterprise Grade Onboarding Portal
            </p>
          </div>
        </div>

        {/* Page Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          HRMS Enterprise v1.0 • © 2026
        </p>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
