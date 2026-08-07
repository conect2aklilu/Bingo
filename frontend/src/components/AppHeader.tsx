import React from 'react';
import { Link } from 'react-router-dom';
import { Language } from '../context/LanguageContext';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  balance?: number;
  language: Language;
  setLanguage: (lang: Language) => void;
  showLogout?: boolean;
  onLogout?: () => void;
  backTo?: string;
}

export default function AppHeader({
  title,
  subtitle,
  balance,
  language,
  setLanguage,
  showLogout,
  onLogout,
  backTo,
}: AppHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 14,
        background: 'linear-gradient(135deg, #0b1120 0%, #121f3d 100%)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.22)',
        marginBottom: 24,
        border: '1px solid rgba(148, 163, 184, 0.12)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {backTo ? (
          <Link
            to={backTo}
            style={{
              color: '#cbd5e1',
              border: '1px solid rgba(203, 213, 225, 0.2)',
              padding: '8px 12px',
              borderRadius: 10,
              textDecoration: 'none',
              background: 'rgba(148, 163, 184, 0.06)',
            }}
          >
            ←
          </Link>
        ) : null}
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: 0.5 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>{subtitle}</div> : null}
          {typeof balance === 'number' ? (
            <div style={{ marginTop: 6, fontSize: 13, color: '#cbd5e1' }}>
              Balance: <strong>{balance.toFixed(2)} Birr</strong>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          style={{
            minWidth: 120,
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            background: '#0f1720',
            color: '#eef2f6',
          }}
        >
          <option value="en">English</option>
          <option value="am">አማርኛ</option>
        </select>
        {showLogout && onLogout ? (
          <button
            onClick={onLogout}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(37, 99, 235, 0.4)',
              background: '#2563eb',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Logout
          </button>
        ) : null}
      </div>
    </div>
  );
}
