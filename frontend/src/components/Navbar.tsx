import React from 'react';
import { Layers, ShieldCheck, UploadCloud, BarChart3 } from 'lucide-react';

interface NavbarProps {
  currentView: 'dashboard' | 'upload' | 'review';
  onNavigate: (view: 'dashboard' | 'upload') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="navbar">
      <div className="brand" onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer' }}>
        <Layers size={24} />
        <span>BhoomiX</span>
        <span className="brand-badge">SIH26018 V0.1</span>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
          style={{ background: 'none', border: 'none' }}
        >
          <BarChart3 size={16} style={{ display: 'inline', marginRight: 6 }} />
          Dashboard
        </button>
        <button
          className={`nav-item ${currentView === 'upload' ? 'active' : ''}`}
          onClick={() => onNavigate('upload')}
          style={{ background: 'none', border: 'none' }}
        >
          <UploadCloud size={16} style={{ display: 'inline', marginRight: 6 }} />
          Upload Document
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748b' }}>
          <ShieldCheck size={16} color="#15803d" />
          <span>Demo Environment</span>
        </div>
      </nav>
    </header>
  );
};
