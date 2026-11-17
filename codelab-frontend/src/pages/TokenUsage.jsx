import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line
} from 'recharts';
import { Activity, DollarSign, Database, Clock, XCircle } from 'lucide-react';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import SpotlightCard from '../components/ui/SpotlightCard';
import ScrollReveal from '../components/ui/ScrollReveal';

const COLORS = ['#2E90FA', '#F79009', '#12B76A', '#F04438', '#7F56D9', '#E62E7B'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '8px 12px',
      boxShadow: 'var(--shadow-md)', fontSize: '0.8rem',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || 'var(--text-secondary)' }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.name.toLowerCase().includes('cost') ? `$${p.value.toFixed(4)}` : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const TokenUsage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all'); // all, 7d, 30d

  useEffect(() => {
    fetchUsageData();
  }, [dateRange]);

  const fetchUsageData = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = '';
      if (dateRange !== 'all') {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (dateRange === '7d' ? 7 : 30));
        query = `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }
      
      const res = await api.get(`/usage/my-stats${query}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load token usage');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="page-content flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon" style={{ background: 'var(--error-light)', color: 'var(--error)' }}>
            <XCircle size={28} />
          </div>
          <h3 className="empty-title">Error Loading Data</h3>
          <p className="empty-desc">{error}</p>
          <button className="btn btn-primary" onClick={fetchUsageData}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, breakdownByModel, breakdownByOperation, dailyUsage } = data;
  
  const formattedModelData = breakdownByModel.map((item, index) => ({
    name: item._id,
    value: item.tokens,
    cost: item.cost,
    color: COLORS[index % COLORS.length]
  }));

  const formattedOpData = breakdownByOperation.map((item, index) => ({
    name: item._id,
    value: item.tokens,
    cost: item.cost,
    color: COLORS[(index + 2) % COLORS.length]
  }));

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Token Usage & Cost</h1>
          <p className="page-subtitle">Track your AI feature usage and estimated costs</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            className="input" 
            style={{ width: 'auto', padding: '6px 12px' }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <button className="btn btn-outline" onClick={fetchUsageData} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Tokens', value: stats.totalTokens, icon: <Database size={18} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: 'Estimated Cost', value: `$${(stats.totalCost || 0).toFixed(4)}`, icon: <DollarSign size={18} />, color: 'var(--success)', bg: 'var(--success-light)' },
          { label: 'AI Requests', value: stats.totalRequests, icon: <Activity size={18} />, color: 'var(--accent)', bg: 'var(--accent-light)' },
          { label: 'Failed Requests', value: stats.failedRequests, icon: <XCircle size={18} />, color: 'var(--error)', bg: 'var(--error-light)' },
        ].map((s, i) => (
          <SpotlightCard key={s.label} className="stat-card" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="stat-card-header">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div>
              <div className="stat-value">
                {typeof s.value === 'string' && s.value.startsWith('$') ? s.value : <AnimatedNumber value={s.value} />}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <SpotlightCard className="stat-card">
          <div className="stat-label mb-2">Input vs Output Tokens</div>
          <div className="flex items-end gap-4">
            <div>
              <div className="text-sm text-gray-500">Input</div>
              <div className="stat-value text-blue-500"><AnimatedNumber value={stats.totalInputTokens} /></div>
            </div>
            <div className="text-2xl text-gray-400 font-light mb-1">/</div>
            <div>
              <div className="text-sm text-gray-500">Output</div>
              <div className="stat-value text-green-500"><AnimatedNumber value={stats.totalOutputTokens} /></div>
            </div>
          </div>
        </SpotlightCard>
        <SpotlightCard className="stat-card">
          <div className="stat-label mb-2">Average Response Time</div>
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
              <Clock size={18} />
            </div>
            <div className="stat-value">
              <AnimatedNumber value={Math.round(stats.avgDuration || 0)} /> ms
            </div>
          </div>
        </SpotlightCard>
      </div>

      <ScrollReveal className="chart-container" delay={100} style={{ marginBottom: 24 }}>
        <h3 className="chart-title">Daily Usage Trends</h3>
        {dailyUsage?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="tokens" name="Tokens" stroke="var(--primary)" fillOpacity={1} fill="url(#colorTokens)" animationDuration={800} />
              <Area yAxisId="right" type="monotone" dataKey="cost" name="Cost ($)" stroke="var(--success)" fillOpacity={1} fill="url(#colorCost)" animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No daily usage data available.</p>
          </div>
        )}
      </ScrollReveal>

      <ScrollReveal className="grid-2" delay={200} style={{ marginBottom: 24 }}>
        <div className="chart-container">
          <h3 className="chart-title">Usage by Model (Tokens)</h3>
          {formattedModelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={formattedModelData}
                  cx="50%" cy="50%"
                  outerRadius={90}
                  innerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  animationDuration={800}
                >
                  {formattedModelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p style={{ color: 'var(--text-muted)' }}>No model usage data.</p>
            </div>
          )}
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Usage by Operation (Tokens)</h3>
          {formattedOpData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={formattedOpData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Tokens" radius={[0, 4, 4, 0]} animationDuration={800}>
                  {formattedOpData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p style={{ color: 'var(--text-muted)' }}>No operation usage data.</p>
            </div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
};

export default TokenUsage;
