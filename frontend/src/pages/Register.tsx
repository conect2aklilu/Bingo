import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { inputStyle, buttonStyle } from './Login';
import { initTelegramMiniApp, isTelegramMiniApp } from '../telegram';

export default function Register() {
  const { register } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [telegramInfo, setTelegramInfo] = useState<string | null>(null);

  useEffect(() => {
    const telegram = initTelegramMiniApp();
    if (telegram?.id) {
      setTelegramInfo(`Telegram user detected: ${telegram.username || telegram.firstName || telegram.id}`);
      setUsername(`tg_${telegram.id}`);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await register(username, password);
      nav('/lobby');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24, background: '#1a2432', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{t('brand')}</h2>
        <select value={language} onChange={(e) => setLanguage(e.target.value as any)} style={{ ...inputStyle, width: 110, marginBottom: 0 }}>
          <option value="en">English</option>
          <option value="am">አማርኛ</option>
        </select>
      </div>
      {isTelegramMiniApp() && (
        <div style={{ marginBottom: 12, color: '#93c5fd', fontSize: 13 }}>{telegramInfo || 'Telegram Mini App detected'}</div>
      )}
      <form onSubmit={handleSubmit}>
        <input placeholder={t('username')} value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
        <input
          placeholder={t('passwordHint')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        {error && <div style={{ color: '#f87171', marginBottom: 10 }}>{error}</div>}
        <button type="submit" style={buttonStyle}>{t('registerButton')}</button>
      </form>
      <p style={{ marginTop: 12 }}>
        {t('haveAccount')} <Link to="/login">{t('loginButton')}</Link>
      </p>
    </div>
  );
}
