import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { inputStyle, buttonStyle } from './Login';
import { initTelegramMiniApp, isTelegramMiniApp } from '../telegram';

export default function Register() {
  const { register } = useAuth();
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
      <h2>Create Account</h2>
      {isTelegramMiniApp() && (
        <div style={{ marginBottom: 12, color: '#93c5fd', fontSize: 13 }}>{telegramInfo || 'Telegram Mini App detected'}</div>
      )}
      <form onSubmit={handleSubmit}>
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
        <input
          placeholder="Password (min 6 chars)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        {error && <div style={{ color: '#f87171', marginBottom: 10 }}>{error}</div>}
        <button type="submit" style={buttonStyle}>Register</button>
      </form>
      <p style={{ marginTop: 12 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
