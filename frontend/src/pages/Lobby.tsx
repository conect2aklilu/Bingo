import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

interface TableInfo {
  stake: number;
  gameId: number | null;
  status: string;
  playerCount: number;
}

export default function Lobby() {
  const { user, logout, refreshBalance } = useAuth();
  const nav = useNavigate();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<number, number>>({});
  const [error, setError] = useState('');

  async function loadTables() {
    const res = await api.get('/games/tables');
    setTables(res.data.tables);
  }

  useEffect(() => {
    loadTables();
    refreshBalance().catch(() => {});
    const interval = setInterval(loadTables, 3000);
    return () => clearInterval(interval);
  }, []);

  async function join(stake: number) {
    setError('');
    const cardCount = cardCounts[stake] || 1;
    try {
      const res = await api.post(`/games/${stake}/join`, { cardCount });
      await refreshBalance();
      nav(`/game/${stake}`, { state: { gameId: res.data.gameId, cards: res.data.cards } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join table');
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>🎮 Lobby</h2>
        <div>
          <span style={{ marginRight: 16 }}>💰 {Number(user?.balance ?? 0).toFixed(2)} Birr</span>
          <Link to="/wallet" style={{ marginRight: 16 }}>Wallet</Link>
          {(user?.is_admin || user?.isAdmin) && <Link to="/admin" style={{ marginRight: 16 }}>Admin</Link>}
          <button onClick={logout} style={{ background: 'none', border: '1px solid #29384a', color: '#eef2f6', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {tables.map((t) => (
          <div key={t.stake} style={{ background: '#1a2432', borderRadius: 12, padding: 16 }}>
            <h3>Stake: {t.stake} Birr</h3>
            <p>Status: <b>{t.status}</b></p>
            <p>Players: {t.playerCount}</p>
            <label>
              Cards (1-4):
              <select
                value={cardCounts[t.stake] || 1}
                onChange={(e) => setCardCounts({ ...cardCounts, [t.stake]: Number(e.target.value) })}
                style={{ marginLeft: 8 }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => join(t.stake)}
              disabled={t.status === 'playing'}
              style={{
                display: 'block',
                marginTop: 10,
                width: '100%',
                padding: 8,
                borderRadius: 6,
                border: 'none',
                background: t.status === 'playing' ? '#374151' : '#059669',
                color: '#fff',
                fontWeight: 700,
                cursor: t.status === 'playing' ? 'not-allowed' : 'pointer',
              }}
            >
              {t.status === 'playing' ? 'In progress' : 'Join Table'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
