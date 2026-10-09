import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, FolderOpen, Code2, Terminal, ScanSearch,
  AlertCircle, Bot, BarChart2, User, LogOut, ShieldCheck,
  Users, ChevronRight, ChevronLeft, Sparkles, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',   icon: FolderOpen,      label: 'Projects' },
  { to: '/editor',     icon: Code2,           label: 'Code Editor' },
  { to: '/compiler',   icon: Terminal,        label: 'Compiler' },
  { to: '/analysis',   icon: ScanSearch,      label: 'Analysis' },
  { to: '/issues',     icon: AlertCircle,     label: 'Issues' },
  { to: '/ai',         icon: Sparkles,        label: 'AI Assistant' },
  { to: '/analytics',  icon: BarChart2,       label: 'Analytics' },
];

const adminItems = [
  { to: '/admin',       icon: ShieldCheck, label: 'Admin Dashboard' },
  { to: '/admin/users', icon: Users,       label: 'User Activity' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const location = useLocation();
  const navRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '72px' : '252px');
    localStorage.setItem('sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  // Update active indicator on path or collapse change
  useEffect(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector('.nav-item.active');
    if (activeEl) {
      setIndicatorStyle({
        top: activeEl.offsetTop,
        height: activeEl.offsetHeight,
        opacity: 1,
      });
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname, isCollapsed]);

  const handleNavClick = () => {
    // Close mobile drawer on nav
    if (onClose) onClose();
  };

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`} role="navigation" aria-label="Main navigation" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '18px 0 16px' : '18px 16px 16px' }}>
        <div className="sidebar-logo-icon" aria-hidden="true" style={{ transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>CL</div>
        {!isCollapsed && <span className="sidebar-logo-text" style={{ whiteSpace: 'nowrap', opacity: 1, transition: 'opacity 0.2s' }}>CodeLab</span>}
        {!isCollapsed && <span className="sidebar-logo-badge" aria-label="AI powered">AI</span>}
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="sidebar-toggle-btn"
        style={{
          position: 'absolute', right: -12, top: 24, zIndex: 201,
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--bg)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease'
        }}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Navigation */}
      <div className="sidebar-nav" ref={navRef} style={{ position: 'relative', padding: isCollapsed ? '10px 6px' : '10px 10px' }}>
        
        {/* Animated Active Indicator */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
            background: 'var(--primary-light)',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <div style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '18px', background: 'var(--primary)', borderRadius: '0 2px 2px 0' }} />
        </div>

        {!isCollapsed && <div className="sidebar-section-label" style={{ position: 'relative', zIndex: 1 }}>Main</div>}
        {isCollapsed && <div style={{ height: 20 }}></div>}

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ position: 'relative', zIndex: 1, background: 'transparent', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '10px 0' : '8px 10px' }}
              title={isCollapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <span className="nav-item-icon" aria-hidden="true">
                    <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                </>
              )}
            </NavLink>
          );
        })}

        {isAdmin && (
          <>
            {!isCollapsed && <div className="sidebar-section-label" style={{ marginTop: '8px', position: 'relative', zIndex: 1 }}>Admin</div>}
            {isCollapsed && <div style={{ height: 16, borderBottom: '1px solid var(--border)', margin: '8px 10px 16px' }}></div>}
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  style={{ position: 'relative', zIndex: 1, background: 'transparent', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '10px 0' : '8px 10px' }}
                  title={isCollapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <span className="nav-item-icon" aria-hidden="true">
                        <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                      </span>
                      {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </>
        )}

        {!isCollapsed && <div className="sidebar-section-label" style={{ marginTop: '8px', position: 'relative', zIndex: 1 }}>Account</div>}
        {isCollapsed && <div style={{ height: 16, borderBottom: '1px solid var(--border)', margin: '8px 10px 16px' }}></div>}
        <NavLink
          to="/profile"
          onClick={handleNavClick}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          style={{ position: 'relative', zIndex: 1, background: 'transparent', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '10px 0' : '8px 10px' }}
          title={isCollapsed ? 'Profile' : undefined}
        >
          <span className="nav-item-icon" aria-hidden="true"><User size={17} strokeWidth={location.pathname === '/profile' ? 2.5 : 2} /></span>
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Profile</span>}
        </NavLink>
      </div>

      {/* Footer */}
      <div className="sidebar-footer" style={{ padding: isCollapsed ? '10px 6px' : '10px' }}>
        <div
          className="user-card"
          style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '8px 0' : '7px 8px' }}
          onClick={() => { navigate('/profile'); handleNavClick(); }}
          role="button"
          aria-label={`${user?.name || 'User'} profile`}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/profile')}
          title={isCollapsed ? 'Profile' : undefined}
        >
          <div className="user-avatar" aria-hidden="true">{initials}</div>
          {!isCollapsed && (
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-role">
                {user?.role === 'admin' ? '🛡️ Admin' : '👨‍💻 Developer'}
              </div>
            </div>
          )}
          {!isCollapsed && <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />}
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-ghost w-full"
          style={{
            marginTop: '4px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '8px',
            color: 'var(--error)',
            fontSize: '0.8rem',
            padding: isCollapsed ? '10px 0' : '7px 8px',
            borderRadius: 'var(--radius-sm)',
          }}
          aria-label="Sign out of CodeLab"
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <LogOut size={16} aria-hidden="true" />
          {!isCollapsed && 'Sign out'}
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
