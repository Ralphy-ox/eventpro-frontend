'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

type ForgotStep = 'email' | 'code' | 'newpass' | null;

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState<number | null>(null);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState<ForgotStep>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const router = useRouter();

  useEffect(() => {
    const locked = localStorage.getItem('loginLocked');
    const lockTimestamp = localStorage.getItem('lockTimestamp');
    if (locked && lockTimestamp) {
      const lockEnd = parseInt(lockTimestamp) + 5 * 60 * 1000;
      if (Date.now() < lockEnd) {
        setIsLocked(true);
        setLockTime(lockEnd);
      } else {
        localStorage.removeItem('loginLocked');
        localStorage.removeItem('lockTimestamp');
        localStorage.removeItem('loginAttempts');
      }
    }
    const attempts = localStorage.getItem('loginAttempts');
    if (attempts) setLoginAttempts(parseInt(attempts));
  }, []);

  useEffect(() => {
    if (!isLocked || !lockTime) return;
    const interval = setInterval(() => {
      if (Date.now() >= lockTime) {
        setIsLocked(false); setLockTime(null); setLoginAttempts(0);
        localStorage.removeItem('loginLocked');
        localStorage.removeItem('lockTimestamp');
        localStorage.removeItem('loginAttempts');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked, lockTime]);

  const getRemainingTime = () => {
    if (!lockTime) return '';
    const r = Math.ceil((lockTime - Date.now()) / 1000);
    return `${Math.floor(r / 60)}:${(r % 60).toString().padStart(2, '0')}`;
  };

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
      } catch (err) {
        if (i === retries) throw err;
        setError('Server is waking up, retrying...');
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    throw new Error('Failed after retries');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) { setError(`Account locked. Try again in ${getRemainingTime()}`); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('loginLocked');
        localStorage.removeItem('lockTimestamp');
        setLoginAttempts(0);
        setIsLocked(false);
        if (data.is_organizer) {
          localStorage.removeItem('clientToken');
          localStorage.setItem('organizerToken', data.access);
          if (data.refresh) localStorage.setItem('organizerRefresh', data.refresh);
          localStorage.setItem('isOrganizer', 'true');
          router.push('/organizer-dashboard');
        } else {
          localStorage.removeItem('organizerToken');
          localStorage.setItem('clientToken', data.access);
          if (data.refresh) localStorage.setItem('clientRefresh', data.refresh);
          try {
            const profileRes = await fetch(`${API_BASE}/profile/`, {
              headers: { Authorization: `Bearer ${data.access}` },
            });
            if (profileRes.ok) {
              const profile = await profileRes.json();
              localStorage.setItem('userName', `${profile.first_name} ${profile.last_name}`);
              localStorage.setItem('userId', profile.id?.toString() ?? '');
              localStorage.setItem('isOrganizer', 'false');
            }
          } catch {}
          router.push('/');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('loginAttempts', newAttempts.toString());
        if (newAttempts >= 5) {
          const now = Date.now();
          localStorage.setItem('loginLocked', 'true');
          localStorage.setItem('lockTimestamp', now.toString());
          setIsLocked(true);
          setLockTime(now + 5 * 60 * 1000);
          setError('Too many failed attempts. Account locked for 5 minutes.');
        } else {
          setError(data.message || `Invalid credentials. ${5 - newAttempts} attempt${5 - newAttempts !== 1 ? 's' : ''} remaining.`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('timeout') || msg.includes('fetch') || msg.includes('Failed')) {
        setError('Server is starting up. Please wait a moment and try again.');
      } else {
        setError('Connection error. Please check your internet and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Forgot password handlers ──
  const handleForgotSendCode = async () => {
    setForgotError(''); setForgotMsg(''); setForgotLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setForgotError(data.message || 'Email not found.'); return; }
      setForgotMsg(data.message);
      setForgotStep('code');
      setResendCooldown(60);
    } catch {
      setForgotError('Connection error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyCode = async () => {
    if (forgotCode.length !== 6) { setForgotError('Enter the 6-digit code'); return; }
    setForgotError(''); setForgotLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/verify-reset-code/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode }),
      });
      const data = await res.json();
      if (res.ok && data.valid) { setForgotStep('newpass'); }
      else { setForgotError(data.message || 'Invalid code'); }
    } catch {
      setForgotError('Connection error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    setForgotError('');
    if (newPassword !== confirmNewPassword) { setForgotError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setForgotError('Password must be at least 6 characters'); return; }
    setForgotLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setForgotMsg(data.message);
        setTimeout(() => {
          setForgotStep(null);
          setForgotEmail(''); setForgotCode(''); setNewPassword(''); setConfirmNewPassword('');
          setForgotMsg(''); setForgotError('');
        }, 2000);
      } else {
        setForgotError(data.message || 'Reset failed');
      }
    } catch {
      setForgotError('Connection error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setForgotStep(null);
    setForgotEmail(''); setForgotCode(''); setNewPassword(''); setConfirmNewPassword('');
    setForgotMsg(''); setForgotError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden" style={{ background: '#0a1628' }}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, #0ea5e9, transparent 60%)' }} />
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>E</div>
            <span className="text-3xl font-black text-white">EventPro</span>
          </div>
          <p className="text-slate-400 text-sm">Sign in to your account</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: '#0d1f35', border: '1px solid rgba(14,165,233,0.2)' }}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black text-white">Welcome Back</h1>
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all text-slate-300 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Home
            </button>
          </div>

          <p className="text-sm text-slate-400 mb-6">Enter your credentials — you'll be redirected automatically based on your role.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border text-white placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-sky-500"
                style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setForgotStep('email'); setForgotError(''); setForgotMsg(''); }}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border text-white placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-sky-500"
                style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit" disabled={loading || isLocked}
              className="w-full py-3.5 rounded-xl font-black text-white text-base transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: loading || isLocked ? 'rgba(14,165,233,0.3)' : 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 8px 24px rgba(14,165,233,0.3)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-sm text-slate-400 text-center mb-3">Don't have an account?</p>
            <button
              onClick={() => router.push('/register')}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 active:scale-95 border"
              style={{ background: 'rgba(14,165,233,0.08)', borderColor: 'rgba(14,165,233,0.3)', color: '#7dd3fc' }}
            >
              Create Free Account
            </button>
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {forgotStep && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-8 border" style={{ background: '#0d1f35', borderColor: 'rgba(14,165,233,0.2)' }}>

            {forgotStep === 'email' && (
              <>
                <h3 className="text-xl font-black text-white mb-1">Forgot Password</h3>
                <p className="text-sm text-slate-400 mb-5">Enter your email and we'll send you a reset code.</p>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                <input
                  type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500 mb-4"
                  style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
                />
                {forgotError && <p className="text-red-400 text-sm mb-3">⚠️ {forgotError}</p>}
                <button onClick={handleForgotSendCode} disabled={forgotLoading}
                  className="w-full py-3 rounded-xl font-bold text-white mb-3 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                  {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                </button>
                <button onClick={closeForgot} className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
              </>
            )}

            {forgotStep === 'code' && (
              <>
                <h3 className="text-xl font-black text-white mb-1">Check Your Email</h3>
                <p className="text-sm text-slate-400 mb-1">{forgotMsg}</p>
                <p className="text-sm text-sky-400 font-semibold mb-5">{forgotEmail}</p>
                <label className="block text-sm font-semibold text-slate-300 mb-2">6-Digit Code</label>
                <input
                  type="text" value={forgotCode} onChange={(e) => setForgotCode(e.target.value)}
                  maxLength={6}
                  className="w-full px-4 py-4 rounded-xl border text-center text-3xl tracking-[0.5em] font-black text-white outline-none focus:ring-2 focus:ring-sky-500 mb-4"
                  style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
                />
                {forgotError && <p className="text-red-400 text-sm mb-3">⚠️ {forgotError}</p>}
                <button onClick={handleForgotVerifyCode}
                  className="w-full py-3 rounded-xl font-bold text-white mb-3 transition-all hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                  Verify Code
                </button>
                <button onClick={handleForgotSendCode} disabled={forgotLoading || resendCooldown > 0}
                  className="w-full text-sm text-sky-400 hover:text-sky-300 disabled:text-slate-500 mb-2 transition-colors">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
                <button onClick={() => setForgotStep('email')} className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors">← Back</button>
              </>
            )}

            {forgotStep === 'newpass' && (
              <>
                <h3 className="text-xl font-black text-white mb-1">New Password</h3>
                <p className="text-sm text-slate-400 mb-5">Choose a strong new password.</p>
                <label className="block text-sm font-semibold text-slate-300 mb-2">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500 mb-3"
                  style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
                  />
                <label className="block text-sm font-semibold text-slate-300 mb-2">Confirm Password</label>
                <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500 mb-4"
                  style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
                  />
                {forgotError && <p className="text-red-400 text-sm mb-3">⚠️ {forgotError}</p>}
                {forgotMsg && <p className="text-emerald-400 text-sm mb-3">✅ {forgotMsg}</p>}
                <button onClick={handleForgotReset} disabled={forgotLoading}
                  className="w-full py-3 rounded-xl font-bold text-white mb-3 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                  {forgotLoading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button onClick={() => setForgotStep('code')} className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors">← Back</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
