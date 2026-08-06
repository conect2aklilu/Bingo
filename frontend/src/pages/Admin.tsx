import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Admin() {
  const [pending, setPending] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  async function load() {
    const [txRes, playersRes, summaryRes] = await Promise.all([
      api.get('/admin/transactions', { params: { status: 'pending' } }),
      api.get('/admin/players'),
      api.get('/admin/reports/summary'),
    ]);
    setPending(txRes.data.transactions);
    setPlayers(playersRes.data.players);
    setSummary(summaryRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: number) {
    await api.post(`/admin/transactions/${id}/approve`);
    load();
  }
  async function reject(id: number) {
    await api.post(`/admin/transactions/${id}/reject`);
    load();
  }
  async function toggleBan(id: number, banned: boolean) {
    await api.post(`/admin/players/${id}/${banned ? 'unban' : 'ban'}`);
    load();
  }

  return (
    <div style={{ maxWidth: 900, margin: '30px auto', padding: 16 }}>
      <Link to="/lobby">← Back to Lobby</Link>
      <h2>🛠 Admin Panel</h2>

      {summary && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <Stat label="Total Deposits" value={summary.totalDeposits} />
          <Stat label="Total Withdrawals" value={summary.totalWithdrawals} />
          <Stat label="Platform Fees Earned" value={summary.totalPlatformFees} />
          <Stat label="Games Played" value={summary.gamesPlayed} />
          <Stat label="Total Players" value={summary.totalPlayers} />
        </div>
      )}

      <h3>Pending Deposit / Withdrawal Requests</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#9fb0c3' }}>
            <th>User</th><th>Type</th><th>Amount</th><th>Method</th><th>Reference</th><th></th>
          </tr>
        </thead>
        <tbody>
          {pending.map((t) => (
            <tr key={t.id} style={{ borderTop: '1px solid #29384a' }}>
              <td>{t.username}</td>
              <td>{t.type}</td>
              <td>{Number(t.amount).toFixed(2)}</td>
              <td>{t.method}</td>
              <td>{t.reference}</td>
              <td>
                <button onClick={() => approve(t.id)} style={{ marginRight: 8, background: '#059669', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>
                  Approve
                </button>
                <button onClick={() => reject(t.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>
                  Reject
                </button>
              </td>
            </tr>
          ))}
          {pending.length === 0 && (
            <tr><td colSpan={6} style={{ color: '#9fb0c3', padding: 8 }}>No pending requests.</td></tr>
          )}
        </tbody>
      </table>

      <h3>Players</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#9fb0c3' }}>
            <th>Username</th><th>Balance</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid #29384a' }}>
              <td>{p.username}</td>
              <td>{Number(p.balance).toFixed(2)}</td>
              <td>{p.is_banned ? 'Banned' : 'Active'}</td>
              <td>
                <button
                  onClick={() => toggleBan(p.id, p.is_banned)}
                  style={{ background: p.is_banned ? '#059669' : '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
                >
                  {p.is_banned ? 'Unban' : 'Ban'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: '#1a2432', padding: 12, borderRadius: 8, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: '#9fb0c3' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}
