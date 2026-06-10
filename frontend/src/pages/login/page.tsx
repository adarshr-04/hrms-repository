import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Loader2, AlertCircle, Shield, Building2, Key, Mail, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

type LoginMode = 'login' | 'forgot' | 'reset';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('login');
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot / Reset fields
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { login } = useAuth();

  const parseErrorMessage = (errorData: any, defaultMsg: string): string => {
    if (!errorData) return defaultMsg;
    if (typeof errorData === 'string') return errorData;
    if (Array.isArray(errorData)) return errorData[0] || defaultMsg;
    if (typeof errorData === 'object') {
      for (const key of ['email', 'code', 'error', 'message', 'detail', 'non_field_errors']) {
        if (errorData[key]) {
          const val = errorData[key];
          if (Array.isArray(val)) return val[0] || defaultMsg;
          if (typeof val === 'string') return val;
        }
      }
    }
    return defaultMsg;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await login({ username, password });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Wrong username or password.');
        } else {
          setError(parseErrorMessage(err.response?.data, 'Unable to reach the server. Check if the backend is running and CORS is configured.'));
        }
      } else {
        setError('Login failed due to an unexpected error.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/accounts/forgot-password/', { email });
      setSuccessMsg('A 6-digit verification code has been sent to your email. Please check your inbox.');
      setMode('reset');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(parseErrorMessage(err.response?.data, 'Failed to send verification code.'));
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/accounts/reset-password/', {
        email,
        code,
        new_password: newPassword
      });
      setSuccessMsg('Your password has been reset successfully! You can now log in.');
      setMode('login');
      setUsername(email); // Autofill email as the username for login convenience
      setPassword('');
      setCode('');
      setNewPassword('');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(parseErrorMessage(err.response?.data, 'Failed to reset password.'));
      } else {
        setError('An unexpected error occurred.');
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
      <div style={{
        position: 'absolute', top: '40%', left: '30%',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        filter: 'blur(60px)'
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
        style={{ width: '100%', maxWidth: '440px', padding: '24px', position: 'relative', zIndex: 10 }}
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
            {mode === 'login' && 'Sign in to manage your organization'}
            {mode === 'forgot' && 'Reset your password securely'}
            {mode === 'reset' && 'Enter verification code and new password'}
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
          {/* Notifications / Feedback Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '12px', padding: '12px 16px', marginBottom: '20px'
                }}
              >
                <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />
                <p style={{ color: '#f87171', fontSize: '13px', fontWeight: '500' }}>{error}</p>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '12px', padding: '12px 16px', marginBottom: '20px'
                }}
              >
                <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ color: '#34d399', fontSize: '13px', fontWeight: '500' }}>{successMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ────────────────── Login View ────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  USERNAME OR EMAIL
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={17} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username or company email"
                    style={{
                      width: '100%', paddingLeft: '44px', paddingRight: '16px',
                      paddingTop: '14px', paddingBottom: '14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px', color: 'white', fontSize: '14px',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' }}>
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setSuccessMsg('');
                    }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#818cf8', fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%', paddingLeft: '44px', paddingRight: '44px',
                      paddingTop: '14px', paddingBottom: '14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px', color: 'white', fontSize: '14px',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={17} color="rgba(255,255,255,0.4)" /> : <Eye size={17} color="rgba(255,255,255,0.4)" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{
                  width: '100%', padding: '15px',
                  background: loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none', borderRadius: '12px', color: 'white',
                  fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
                  transition: 'all 0.2s', marginTop: '4px'
                }}
              >
                {loading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Signing In...</>
                ) : (
                  <><Shield size={18} /> Sign In to Dashboard</>
                )}
              </motion.button>
            </form>
          )}

          {/* ────────────────── Forgot Email Input View ────────────────── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  COMPANY EMAIL ADDRESS
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={17} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    style={{
                      width: '100%', paddingLeft: '44px', paddingRight: '16px',
                      paddingTop: '14px', paddingBottom: '14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px', color: 'white', fontSize: '14px',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{
                  width: '100%', padding: '15px',
                  background: loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none', borderRadius: '12px', color: 'white',
                  fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
                  transition: 'all 0.2s', marginTop: '4px'
                }}
              >
                {loading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating Code...</>
                ) : (
                  <><Mail size={18} /> Send Reset Code</>
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-all mt-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </form>
          )}

          {/* ────────────────── OTP Code & New Password View ────────────────── */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  6-DIGIT VERIFICATION CODE
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={17} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter 6-digit OTP code"
                    style={{
                      width: '100%', paddingLeft: '44px', paddingRight: '16px',
                      paddingTop: '14px', paddingBottom: '14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px', color: 'white', fontSize: '14px',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                      letterSpacing: '1px',
                      fontWeight: 'bold'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  NEW PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={17} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{
                      width: '100%', paddingLeft: '44px', paddingRight: '16px',
                      paddingTop: '14px', paddingBottom: '14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px', color: 'white', fontSize: '14px',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{
                  width: '100%', padding: '15px',
                  background: loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none', borderRadius: '12px', color: 'white',
                  fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
                  transition: 'all 0.2s', marginTop: '4px',
                  justifyContent: 'center'
                }}
              >
                {loading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Resetting...</>
                ) : (
                  <><CheckCircle2 size={18} /> Reset & Update Password</>
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError('');
                  setSuccessMsg('');
                }}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-all mt-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <ArrowLeft size={14} /> Back to Email Verification
              </button>
            </form>
          )}

          {/* Footer */}
          <div style={{
            marginTop: '24px', paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
              🔒 Enterprise Grade Security • SSL Encrypted
            </p>
          </div>
        </div>

        {/* Bottom badge */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '24px' }}>
          HRMS Enterprise v1.0 • © 2026
        </p>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}
