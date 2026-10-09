import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  Users, Activity, FolderOpen, Bot, Terminal, ScanSearch,
  Shield, TrendingUp, UserCheck, Clock, RefreshCw, AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import SpotlightCard from '../components/ui/SpotlightCard';
import ScrollReveal from '../components/ui/ScrollReveal';

const ACTIVITY_TYPE_LABELS = {
  login:          '🔑 Login',
  logout:         '🚪 Logout',
  register:       '✨ Registered',
  project_create: '📁 Created project',
  project_open:   '📂 Opened project',
  project_save:   '💾 Saved project',
  project_delete: '🗑️ Deleted project',
  file_upload:    '📤 Uploaded files',
  file_create:    '📄 Created file',
  file_delete:    '🗑️ Deleted file',
  compile:        '⚙️ Compiled code',
  analyze:        '🔍 Ran analysis',
  ai_request:     '🤖 AI request',
  repair_accept:  '✅ Accepted repair',
  repair_reject:  '❌ Rejected repair',
};

const ACTIVITY_COLORS = ['#4F46E5', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '8px 12px',
      boxShadow: 'var(--shadow-md)', fontSize: '0.8rem',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || 'var(--primary)' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/stats');
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/toggle`);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="skeleton" style={{ width: 200, height: 30, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 300, height: 16 }} />
        </div>
        <div className="grid-4" style={{ marginBottom: 20 }}>
          {[1,2,3,4].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius)' }} />
              <div>
                <div className="skeleton" style={{ width: 60, height: 28, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: 90, height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, activityByType, registrationTrend, recentActivity, users } = data;

  const activityChartData = activityByType.slice(0, 8).map((a, i) => ({
    name: ACTIVITY_TYPE_LABELS[a._id]?.replace(/^.{2}/, '').trim() || a._id,
    count: a.count,
    color: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length],
  }));

  const TABS = ['overview', 'users', 'activity'];

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Platform overview and user management</p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            aria-label="Refresh admin data"
          >
            <RefreshCw size={13} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs stagger-1" style={{ marginBottom: 24 }} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Row 1 */}
          <div className="grid-4 stagger-2" style={{ marginBottom: 18 }}>
            {[
              { label: 'Total Users',   value: stats.totalUsers,        icon: <Users size={18} />,     color: 'var(--primary)', bg: 'var(--primary-light)' },
              { label: 'Active Users',  value: stats.activeUsers,       icon: <UserCheck size={18} />,  color: 'var(--success)', bg: 'var(--success-light)' },
              { label: 'New (7 days)',  value: stats.newUsers,          icon: <TrendingUp size={18} />, color: 'var(--accent)',  bg: 'var(--accent-light)' },
              { label: 'Total Projects',value: stats.totalProjects,     icon: <FolderOpen size={18} />, color: 'var(--info)',    bg: 'var(--info-light)' },
            ].map((s, i) => (
              <SpotlightCard key={s.label} className="stat-card" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="stat-card-header">
                  <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                </div>
                <div className="stat-value">
                  <AnimatedNumber value={s.value} />
                </div>
                <div className="stat-label">{s.label}</div>
              </SpotlightCard>
            ))}
          </div>

          {/* Stats Row 2 */}
          <div className="grid-4 stagger-3" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Issues',  value: stats.totalIssues,       icon: <AlertCircle size={18} />, color: 'var(--error)',   bg: 'var(--error-light)' },
              { label: 'Compilations',  value: stats.totalCompilations, icon: <Terminal size={18} />,    color: 'var(--warning)', bg: 'var(--warning-light)' },
              { label: 'Analyses',      value: stats.totalAnalyses,     icon: <Activity size={18} />,    color: 'var(--success)', bg: 'var(--success-light)' },
              { label: 'AI Requests',   value: stats.totalAiRequests,   icon: <Bot size={18} />,         color: 'var(--accent)',  bg: 'var(--accent-light)' },
            ].map((s, i) => (
              <SpotlightCard key={s.label} className="stat-card" style={{ animationDelay: `${(i + 4) * 80}ms` }}>
                <div className="stat-card-header">
                  <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                </div>
                <div className="stat-value">
                  <AnimatedNumber value={s.value} />
                </div>
                <div className="stat-label">{s.label}</div>
              </SpotlightCard>
            ))}
          </div>

          {/* Charts */}
          <ScrollReveal delay={150} className="grid-2" style={{ marginBottom: 24 }}>
            <div className="chart-container">
              <h3 className="chart-title">Activity by Type</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activityChartData} layout="vertical" margin={{ left: 55 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} animationDuration={800}>
                    {activityChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3 className="chart-title">New Registrations (7 days)</h3>
              {registrationTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={registrationTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} name="Registrations" animationDuration={800} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No new registrations in the last 7 days</p>
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Recent Activity */}
          <ScrollReveal delay={200} className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: '1rem' }}>Recent Activity</h3>
            <div className="divide-y">
              {recentActivity.slice(0, 20).map((a) => (
                <div key={a._id} style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'var(--primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--primary)', flexShrink: 0,
                    fontSize: '0.75rem', fontWeight: 700,
                  }} aria-hidden="true">
                    {a.userName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{a.userName}</span>
                    {' '}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {ACTIVITY_TYPE_LABELS[a.type] || a.action}
                      {a.projectName && ` — ${a.projectName}`}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <ScrollReveal delay={100} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>All Users</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {users?.length || 0} total users
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} role="table" aria-label="User management table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['User', 'Role', 'Projects', 'Analyses', 'AI Requests', 'Last Login', 'Status'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        textAlign: 'left', padding: '10px 16px',
                        fontSize: '0.7rem', fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.6px',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr
                    key={u._id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--primary-light)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--primary)', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0,
                        }} aria-hidden="true">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8375rem' }}>{u.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-neutral'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {u.stats?.totalProjects || 0}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {u.stats?.totalAnalyses || 0}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {u.stats?.totalAiRequests || 0}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {u.lastLogin ? formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true }) : 'Never'}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <button
                        onClick={() => toggleUserStatus(u._id, u.isActive)}
                        className={`btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-success'}`}
                        aria-label={u.isActive ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <ScrollReveal delay={100} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Full Activity Log</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {recentActivity?.length} recent events
            </p>
          </div>
          <div style={{ padding: '0 20px' }}>
            <div className="divide-y">
              {recentActivity?.map((a) => (
                <div key={a._id} style={{ padding: '11px 0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--primary)',
                    marginTop: 5, flexShrink: 0,
                  }} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                      <strong>{a.userName}</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {ACTIVITY_TYPE_LABELS[a.type] || a.type}
                        {a.projectName && ` — ${a.projectName}`}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {format(new Date(a.createdAt), 'MMM d, yyyy HH:mm:ss')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
};

export default AdminDashboard;
