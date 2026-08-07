import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import AppHeader from '../components/AppHeader';

interface TableInfo {
  stake: number;
  gameId: number | null;
  status: string;
  playerCount: number;
}

export default function Lobby() {
  const { user, logout, refreshBalance } = useAuth();
  const { t, language, setLanguage } = useLanguage();
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
    <div style={{ width: 'min(100%, 720px)', margin: '24px auto', padding: 16 }}>
      <AppHeader
        title={t('brandTitle')}
        balance={Number(user?.balance ?? 0)}
        language={language}
        setLanguage={(lang) => setLanguage(lang as any)}
        showAdminLink={Boolean(user?.is_admin || (user as any)?.isAdmin)}
        adminLink="/admin"
        showWalletLink
        walletLink="/wallet"
        showLogout
        onLogout={logout}
      />

      {error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {tables.map((table) => (
          <div key={table.stake} style={{ background: '#1a2432', borderRadius: 12, padding: 16 }}>
            <h3>{t('table')}: {table.stake} Birr</h3>
            <p>{t('status')}: <b>{table.status}</b></p>
            <p>{t('players')}: {table.playerCount}</p>
            <label>
              {t('cards')} (1-4):
              <select
                value={cardCounts[table.stake] || 1}
                onChange={(e) => setCardCounts({ ...cardCounts, [table.stake]: Number(e.target.value) })}
                style={{ marginLeft: 8 }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => join(table.stake)}
              disabled={table.status === 'playing'}
              style={{
                display: 'block',
                marginTop: 10,
                width: '100%',
                padding: 8,
                borderRadius: 6,
                border: 'none',
                background: table.status === 'playing' ? '#374151' : '#059669',
                color: '#fff',
                fontWeight: 700,
                cursor: table.status === 'playing' ? 'not-allowed' : 'pointer',
              }}
            >
              {table.status === 'playing' ? t('inProgress') : t('joinTable')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
