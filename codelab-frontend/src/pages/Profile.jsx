import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { User, Mail, Shield, Activity, Code2, Bot, Terminal, Save, CheckCircle } from 'lucide-react';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error('Name and email are required');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return toast.error('Please enter a valid email address');
    setSavingProfile(true);
    setSaveSuccess(false);
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data.user);
      toast.success('Profile updated successfully');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const stats = [
    { label: 'Projects',     value: user?.stats?.totalProjects || 0,     icon: Code2,     color: 'var(--primary)', bg: 'var(--primary-light)' },
    { label: 'Analyses',     value: user?.stats?.totalAnalyses || 0,     icon: Activity,  color: 'var(--success)', bg: 'var(--success-light)' },
    { label: 'AI Requests',  value: user?.stats?.totalAiRequests || 0,   icon: Bot,       color: 'var(--accent)',  bg: 'var(--accent-light)' },
    { label: 'Compilations', value: user?.stats?.totalCompilations || 0, icon: Terminal,  color: 'var(--warning)', bg: 'var(--warning-light)' },
  ];

  return (
    <div className="page-content" style={{ maxWidth: 760 }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="card stagger-1" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Avatar */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 800,
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(79,70,229,0.25)',
            letterSpacing: '-0.5px',
          }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 3, letterSpacing: '-0.3px' }}>
            {user?.name}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8375rem', marginBottom: 8 }}>
            {user?.email}
          </p>
          <span className={`badge ${user?.role === 'admin' ? 'badge-purple' : 'badge-primary'}`} style={{ display: 'inline-flex' }}>
            {user?.role === 'admin' ? <><Shield size={9} aria-hidden="true" /> Admin</> : 'Developer'}
          </span>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>Member since</div>
          <div style={{ fontSize: '0.8375rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 stagger-2" style={{ marginBottom: 20 }}>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card card-sm" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
              <Icon size={16} aria-hidden="true" />
            </div>
            <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1 }}>
              {value}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Account Details Form */}
      <div className="card stagger-3" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Account Details</h3>
          {saveSuccess && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
              <CheckCircle size={13} aria-hidden="true" /> Saved
            </span>
          )}
        </div>
        <form onSubmit={handleSaveProfile} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-name">Full Name</label>
            <input
              id="profile-name"
              className="form-input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Your full name"
              aria-label="Full name"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-email">Email Address</label>
            <input
              id="profile-email"
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="your@email.com"
              aria-label="Email address"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-role">Role</label>
            <input
              id="profile-role"
              className="form-input"
              value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
              disabled
              aria-label="Role (read-only)"
              style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }}
            />
            <p className="form-hint">Role is assigned by administrators and cannot be changed.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingProfile}
              aria-label={savingProfile ? 'Saving...' : 'Save Changes'}
            >
              {savingProfile
                ? <><span className="loading-spinner" aria-hidden="true" /> Saving...</>
                : <><Save size={14} aria-hidden="true" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>

      {/* Account Information */}
      <div className="card stagger-4">
        <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 16 }}>Account Information</h3>
        <div className="divide-y">
          {[
            { label: 'Member since',  value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
            { label: 'Last login',    value: user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A' },
            { label: 'Account status',value: user?.isActive ? '✅ Active' : '❌ Inactive' },
          ].map(({ label, value }) => (
            <div key={label} className="info-row">
              <span className="info-row-label">{label}</span>
              <span className="info-row-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
