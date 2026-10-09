import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectProvider } from '../../contexts/ProjectContext';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = () => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pathPart = location.pathname.split('/')[1];
  const pageClass = pathPart ? `page-${pathPart}` : 'page-dashboard';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: '1.1rem',
              animation: 'pulse-ring 1.5s infinite',
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
            }}
          >
            CL
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8375rem', fontWeight: 500 }}>
            Loading CodeLab...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <ProjectProvider>
      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`app-layout app-background ${pageClass}`}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </ProjectProvider>
  );
};

export default Layout;
