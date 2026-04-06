'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

const iStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(14,165,233,0.2)' };
const iCls = "w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm";
const lCls = "block text-xs font-bold text-sky-400 uppercase tracking-widest mb-2";

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('Failed after retries');
}

export default function ClientRegister() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Creating Account...');
  const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    timerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const getErrorMessage = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data.message || fallback;
    } catch {
      return `${fallback} (HTTP ${res.status})`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setLoadingMsg('Creating Account...');

    // Show "waking up server" message after 5s if still loading
    const wakeTimer = setTimeout(() => setLoadingMsg('Waking up server, please wait...'), 5000);

    try {
      const res = await fetchWithRetry(`${API_BASE}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, date_of_birth: dob, address, email, password }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Registration failed'));
        return;
      }
      const data = await res.json();
      if (data.requires_verification) { setPendingEmail(email); setStep('verify'); startCooldown(); }
      else { setError(data.message || 'Registration failed'); }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('timeout') || msg.includes('fetch') || msg.includes('network') || msg.toLowerCase().includes('failed')) {
        setError('The server is starting up. Please wait 30 seconds and try again.');
      } else {
        setError(`Connection error. ${msg}`);
      }
    } finally {
      clearTimeout(wakeTimer);
      setLoading(false);
      setLoadingMsg('Creating Account...');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/verify-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Verification failed'));
        return;
      }
      const data = await res.json();
      if (data.access) {
        localStorage.setItem('clientToken', data.access);
        if (data.refresh) localStorage.setItem('clientRefresh', data.refresh);
        setStep('success');
        setTimeout(() => router.push('/'), 2500);
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('timeout') ? 'Server timeout. Please try again.' : `Connection error. ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMsg(''); setError(''); setResendLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE}/resend-verification-code/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      setResendMsg(data.message); setCode(''); startCooldown();
    } catch { setError('Connection error. Please try again.'); }
    finally { setResendLoading(false); }
  };

  const pageBg = { background: '#0a1628' };
  const dotGrid = { backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '30px 30px' };
  const cardStyle = { background: '#0d1f35', border: '1px solid rgba(14,165,233,0.2)' };
  const btnPrimary = "w-full py-3.5 rounded-xl font-black text-white text-sm transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-40";

  const Logo = () => (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>E</div>
        <span className="text-2xl font-black text-white">EventPro</span>
      </div>
    </div>
  );

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={pageBg}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={dotGrid} />
        <div className="max-w-sm w-full text-center relative z-10">
          <div className="rounded-2xl p-10" style={cardStyle}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
              <svg className="w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Account Created!</h1>
            <p className="text-slate-400 text-sm">Redirecting you home...</p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={pageBg}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={dotGrid} />
        <div className="max-w-sm w-full relative z-10">
          <Logo />
          <div className="rounded-2xl p-8" style={cardStyle}>
            <div className="w-12 h-12 rounded-xl mb-5 flex items-center justify-center"
              style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
              <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-white mb-1">Verify Your Email</h1>
            <p className="text-xs text-slate-400 mb-1">We sent a 6-digit code to:</p>
            <p className="font-bold text-sky-400 text-sm mb-6">{pendingEmail}</p>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className={lCls}>Verification Code</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6} required autoFocus
                  className="w-full px-4 py-4 rounded-xl text-center text-3xl tracking-[0.5em] font-black text-white outline-none focus:ring-2 focus:ring-sky-500"
                  style={iStyle} placeholder="000000" />
              </div>
              {error && <div className="px-4 py-3 rounded-xl text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>{error}</div>}
              {resendMsg && <div className="px-4 py-3 rounded-xl text-xs font-semibold" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#7dd3fc' }}>{resendMsg}</div>}
              <button type="submit" disabled={loading} className={btnPrimary}
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Verify & Continue'}
              </button>
              <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || resendLoading}
                className="w-full text-xs text-sky-400 hover:text-sky-300 disabled:text-slate-600 transition-colors">
                {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive a code? Resend"}
              </button>
              <button type="button" onClick={() => { setStep('form'); setError(''); setCode(''); setResendMsg(''); }}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
                ← Back to registration
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden" style={pageBg}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top right, #0ea5e9, transparent 60%)' }} />
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={dotGrid} />

      <div className="max-w-2xl w-full relative z-10">
        <Logo />
        <div className="rounded-2xl p-8" style={cardStyle}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl font-black text-white">Create Account</h1>
              <p className="text-xs text-slate-400 mt-0.5">Fill in your details to get started</p>
            </div>
            <button onClick={() => router.push('/')}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all text-slate-400 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Home
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'First Name', value: firstName, setter: setFirstName, type: 'text', placeholder: 'John' },
              { label: 'Last Name', value: lastName, setter: setLastName, type: 'text', placeholder: 'Doe' },
              { label: 'Date of Birth', value: dob, setter: setDob, type: 'date', placeholder: '' },
              { label: 'Email Address', value: email, setter: setEmail, type: 'email', placeholder: 'john@email.com' },
            ].map(f => (
              <div key={f.label}>
                <label className={lCls}>{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} required
                  placeholder={f.placeholder} className={iCls} style={f.type === 'date' ? { ...iStyle, colorScheme: 'dark' } : iStyle} />
              </div>
            ))}

            <div className="col-span-1 sm:col-span-2">
              <label className={lCls}>Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} required
                placeholder="Your full address" className={iCls} style={iStyle} />
            </div>

            <div>
              <label className={lCls}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Min 6 characters" className={iCls} style={iStyle} />
            </div>

            <div>
              <label className={lCls}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                placeholder="Repeat password" className={iCls} style={iStyle} />
            </div>

            {error && (
              <div className="col-span-1 sm:col-span-2 px-4 py-3 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <div className="col-span-1 sm:col-span-2">
              <button type="submit" disabled={loading} className={btnPrimary}
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
                <span className="flex items-center justify-center gap-2">
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loading ? loadingMsg : 'Create Account'}
                </span>
              </button>
            </div>
          </form>

          <p className="text-xs text-center mt-5 text-slate-500">
            Already have an account?{' '}
            <span onClick={() => router.push('/signin')} className="text-sky-400 cursor-pointer hover:text-sky-300 font-semibold transition-colors">
              Sign In
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
