'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LogoutOverlay, useLogout } from '@/components/LogoutOverlay';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

const iStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };
const iCls = "w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm";
const lCls = "block text-xs font-bold text-sky-400 uppercase tracking-widest mb-2";

interface UserInfo {
  first_name?: string;
  last_name?: string;
  email?: string;
  address?: string;
  preferred_payment_method?: string;
  profile_photo?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { loggingOut, logout } = useLogout();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [updatingInfo, setUpdatingInfo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Email change state
  const [emailStep, setEmailStep] = useState<'idle' | 'input' | 'verify'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [emailErr, setEmailErr] = useState('');

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('clientToken');
    const res = await fetch(`${API_BASE}/profile/`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) { localStorage.removeItem('clientToken'); router.push('/signin'); return; }
    if (res.ok) {
      const data: UserInfo = await res.json();
      setUserInfo(data); setFirstName(data.first_name || ''); setLastName(data.last_name || '');
      setAddress(data.address || ''); setPaymentMethod(data.preferred_payment_method || 'Cash');
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) { alert('Please login'); router.push('/signin'); return; }
    loadProfile();
  }, [loadProfile, router]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const token = localStorage.getItem('clientToken');
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`${API_BASE}/profile/photo/`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
    });
    if (res.ok) loadProfile();
    else { const d = await res.json(); alert(d.message || 'Upload failed'); }
    setUploadingPhoto(false);
  };

  const handleUpdateInfo = async () => {
    if (!firstName.trim() || !lastName.trim()) { alert('Name fields are required'); return; }
    setUpdatingInfo(true);
    const token = localStorage.getItem('clientToken');
    const res = await fetch(`${API_BASE}/profile/update/`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, address }),
    });
    if (res.ok) { setEditingInfo(false); loadProfile(); }
    else { const d = await res.json(); alert(d.message || 'Failed'); }
    setUpdatingInfo(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) { alert('Fill in all fields'); return; }
    if (newPassword !== confirmPassword) { alert('Passwords do not match'); return; }
    if (newPassword.length < 6) { alert('Min 6 characters'); return; }
    setLoading(true);
    const token = localStorage.getItem('clientToken');
    const res = await fetch(`${API_BASE}/change-password/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (res.ok) { alert('Password changed!'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
    else { const d = await res.json(); alert(d.message || 'Failed'); }
    setLoading(false);
  };

  const handleRequestEmailChange = async () => {
    setEmailErr(''); setEmailMsg(''); setEmailLoading(true);
    const token = localStorage.getItem('clientToken');
    const res = await fetch(`${API_BASE}/profile/change-email/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ new_email: newEmail }),
    });
    const d = await res.json();
    if (res.ok) { setEmailMsg(d.message); setEmailStep('verify'); }
    else setEmailErr(d.message || 'Failed');
    setEmailLoading(false);
  };

  const handleVerifyEmailChange = async () => {
    setEmailErr(''); setEmailLoading(true);
    const token = localStorage.getItem('clientToken');
    const res = await fetch(`${API_BASE}/profile/verify-email-change/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: emailCode }),
    });
    const d = await res.json();
    if (res.ok) {
      setEmailStep('idle'); setNewEmail(''); setEmailCode(''); setEmailMsg(''); setEmailErr('');
      loadProfile();
    } else setEmailErr(d.message || 'Invalid code');
    setEmailLoading(false);
  };

  const handleUpdatePayment = async () => {    setUpdatingPayment(true);
    const token = localStorage.getItem('clientToken');
    const res = await fetch(`${API_BASE}/profile/payment-preference/`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ payment_method: paymentMethod }),
    });
    if (res.ok) { loadProfile(); }
    else { const d = await res.json(); alert(d.message || 'Failed'); }
    setUpdatingPayment(false);
  };

  const btn = "w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-40";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
      <LogoutOverlay visible={loggingOut} />
      <MobileNav links={[
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
        { label: 'Reviews', href: '/ratings' },
        { label: 'My Bookings', href: '/my-bookings' },
        { label: 'Book Now', href: '/client/dashboard', highlight: true },
        { label: 'Settings', dropdown: [
          { label: 'Profile', href: '/profile' },
          { label: 'Logout', onClick: () => logout('clientToken', '/'), danger: true },
        ]},
      ]} showNotification />

      {/* Top banner — full width */}
      <div className="w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c2d4a 60%, #0f172a 100%)', borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute right-0 top-0 w-96 h-full opacity-10" style={{ background: 'radial-gradient(ellipse at right, #0ea5e9, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8 relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-4xl font-black text-white shrink-0 relative group"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 8px 32px rgba(14,165,233,0.4)' }}>
            {userInfo?.profile_photo
              ? <Image src={userInfo.profile_photo} alt="avatar" fill unoptimized className="object-cover" />
              : userInfo ? userInfo.first_name?.[0]?.toUpperCase() : '?'
            }
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-2xl">
              <span className="text-white text-xs font-bold">{uploadingPhoto ? '...' : '📷'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
            </label>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {userInfo ? `${userInfo.first_name} ${userInfo.last_name}` : 'Loading...'}
            </h1>
            <p className="text-sky-400 text-sm mt-1">{userInfo?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold text-sky-300"
              style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
              Client Account
            </span>
          </div>
        </div>
      </div>

      {/* Main content — full width two-column */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

          {/* Left column — Account Info (wider) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Account Information */}
            {userInfo && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(14,165,233,0.06)' }}>
                  <div>
                    <h2 className="text-base font-black text-white">Account Information</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Manage your personal details</p>
                  </div>
                  <button onClick={() => setEditingInfo(!editingInfo)}
                    className="px-4 py-2 text-xs font-bold rounded-xl transition-all"
                    style={editingInfo
                      ? { background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }
                      : { background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.4)', color: '#38bdf8' }}>
                    {editingInfo ? 'Cancel' : 'Edit Profile'}
                  </button>
                </div>

                <div className="p-6">
                  {editingInfo ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={lCls}>First Name</label>
                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={iCls} style={iStyle} />
                      </div>
                      <div>
                        <label className={lCls}>Last Name</label>
                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={iCls} style={iStyle} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lCls}>Address</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={iCls} style={iStyle} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lCls}>Email Address</label>
                        {emailStep === 'idle' && (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 rounded-xl px-4 py-3 text-slate-400 text-sm"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              {userInfo.email}
                            </div>
                            <button type="button" onClick={() => { setEmailStep('input'); setNewEmail(''); setEmailErr(''); setEmailMsg(''); }}
                              className="px-4 py-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
                              style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', color: '#38bdf8' }}>
                              Change
                            </button>
                          </div>
                        )}
                        {emailStep === 'input' && (
                          <div className="space-y-2">
                            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                              className={iCls} style={iStyle} />
                            {emailErr && <p className="text-red-400 text-xs">{emailErr}</p>}
                            <div className="flex gap-2">
                              <button type="button" onClick={handleRequestEmailChange} disabled={emailLoading || !newEmail.trim()}
                                className="flex-1 py-2.5 text-white text-xs font-bold rounded-xl disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                                {emailLoading ? 'Sending...' : 'Send Code'}
                              </button>
                              <button type="button" onClick={() => { setEmailStep('idle'); setEmailErr(''); }}
                                className="px-4 py-2.5 text-xs font-bold rounded-xl text-slate-400"
                                style={{ background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
                            </div>
                          </div>
                        )}
                        {emailStep === 'verify' && (
                          <div className="space-y-2">
                            {emailMsg && <p className="text-sky-400 text-xs">Code sent to your current email. Enter it below.</p>}
                            <input type="text" value={emailCode} onChange={e => setEmailCode(e.target.value)}
                              maxLength={6}
                              className="w-full px-4 py-3 rounded-xl border text-center text-2xl tracking-[0.4em] font-black text-white outline-none focus:ring-2 focus:ring-sky-500"
                              style={iStyle} />
                            {emailErr && <p className="text-red-400 text-xs">{emailErr}</p>}
                            <div className="flex gap-2">
                              <button type="button" onClick={handleVerifyEmailChange} disabled={emailLoading || emailCode.length !== 6}
                                className="flex-1 py-2.5 text-white text-xs font-bold rounded-xl disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                                {emailLoading ? 'Verifying...' : 'Verify & Save'}
                              </button>
                              <button type="button" onClick={() => setEmailStep('input')}
                                className="px-4 py-2.5 text-xs font-bold rounded-xl text-slate-400"
                                style={{ background: 'rgba(255,255,255,0.07)' }}>← Back</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <button onClick={handleUpdateInfo} disabled={updatingInfo} className={btn}
                          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
                          {updatingInfo ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { label: 'First Name', value: userInfo.first_name },
                        { label: 'Last Name', value: userInfo.last_name },
                        { label: 'Email Address', value: userInfo.email },
                        { label: 'Address', value: userInfo.address || 'Not set' },                      ].map(item => (
                        <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-xs text-sky-500 font-bold uppercase tracking-widest mb-1">{item.label}</p>
                          <p className="text-white font-semibold text-sm">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Change Password */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(14,165,233,0.06)' }}>
                <h2 className="text-base font-black text-white">Change Password</h2>
                <p className="text-xs text-slate-400 mt-0.5">Update your account security</p>
              </div>
              <div className="p-6">
                <form onSubmit={handleChangePassword} className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={lCls}>Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                      className={iCls} style={iStyle} />
                  </div>
                  <div>
                    <label className={lCls}>New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className={iCls} style={iStyle} />
                  </div>
                  <div>
                    <label className={lCls}>Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className={iCls} style={iStyle} />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" disabled={loading} className={btn}
                      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right column — Payment + Quick Info */}
          <div className="space-y-6">

            {/* Payment Preference */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(14,165,233,0.06)' }}>
                <h2 className="text-base font-black text-white">Payment Preference</h2>
                <p className="text-xs text-slate-400 mt-0.5">Default payment method</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { value: 'Cash', label: 'Cash', desc: 'Pay at the venue' },
                  { value: 'GCash', label: 'GCash', desc: 'Mobile wallet' },
                ].map(m => (
                  <label key={m.value} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: paymentMethod === m.value ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${paymentMethod === m.value ? 'rgba(14,165,233,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    }}>
                    <input type="radio" name="payment" value={m.value} checked={paymentMethod === m.value}
                      onChange={e => setPaymentMethod(e.target.value)} className="w-4 h-4 accent-sky-500" />
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">{m.label}</p>
                      <p className="text-xs text-slate-400">{m.desc}</p>
                    </div>
                    {paymentMethod === m.value && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#0ea5e9' }}>
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
                <button onClick={handleUpdatePayment} disabled={updatingPayment} className={btn + " mt-2"}
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
                  {updatingPayment ? 'Saving...' : 'Save Preference'}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(14,165,233,0.06)' }}>
                <h2 className="text-base font-black text-white">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { label: 'View My Bookings', href: '/my-bookings' },
                  { label: 'Create New Booking', href: '/client/dashboard' },
                  { label: 'Browse Events', href: '/events' },
                ].map(a => (
                  <a key={a.label} href={a.href}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 transition-all hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {a.label}
                    <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
