import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { connectSocket, getSocket } from '../socket';
import { useAuth } from '../context/AuthContext';
import BingoCard from '../components/BingoCard';

export default function GameRoom() {
  const { stake } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const { refreshBalance, token } = useAuth();

  const initialCards = (location.state as any)?.cards || [];
  const [cards] = useState<number[][][]>(initialCards);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [status, setStatus] = useState('waiting');
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    const socket = getSocket() || connectSocket(token);
    socket.emit('join_table', Number(stake));

    const handleTableState = (t: any) => {
      setStatus(t.status);
      setCalledNumbers(t.calledNumbers || []);
      setCountdownEndsAt(t.countdownEndsAt || null);
    };

    const handleNumberCalled = (data: any) => {
      setCalledNumbers(data.calledNumbers);
    };

    const handleGameOver = (data: any) => {
      setResult(data);
      refreshBalance().catch(() => {});
    };

    socket.on('table_state', handleTableState);
    socket.on('number_called', handleNumberCalled);
    socket.on('game_over', handleGameOver);

    return () => {
      socket.emit('leave_table', Number(stake));
      socket.off('table_state', handleTableState);
      socket.off('number_called', handleNumberCalled);
      socket.off('game_over', handleGameOver);
    };
  }, [stake, token, refreshBalance]);

  function claim(cardIndex: number) {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('claim_bingo', { stake: Number(stake), cardIndex }, (res: any) => {
      if (!res.valid) {
        setMessage(res.error || 'Not a winning card yet — keep playing!');
        setTimeout(() => setMessage(''), 3000);
      }
    });
  }

  return (
    <div style={{ maxWidth: 900, margin: '30px auto', padding: 16 }}>
      <button onClick={() => nav('/lobby')} style={{ marginBottom: 16, background: 'none', border: '1px solid #29384a', color: '#eef2f6', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>
        ← Back to Lobby
      </button>

      <h2>Table: {stake} Birr — Status: {status}</h2>

      {status === 'countdown' && countdownEndsAt && (
        <p>Game starts in ~{Math.max(0, Math.round((countdownEndsAt - Date.now()) / 1000))}s</p>
      )}

      {message && <div style={{ color: '#fbbf24', marginBottom: 10 }}>{message}</div>}

      {result && (
        <div style={{ background: '#1a2432', padding: 16, borderRadius: 10, marginBottom: 16 }}>
          {result.cancelled ? (
            <p>Round cancelled — stakes refunded.</p>
          ) : (
            <p>
              🏆 Winner: user #{result.winnerId} ({result.pattern}) — payout {result.payout} Birr
            </p>
          )}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <b>Called numbers ({calledNumbers.length}/75):</b>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {calledNumbers.map((n) => (
            <span key={n} style={{ background: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
              {n}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {cards.map((grid, i) => (
          <BingoCard key={i} grid={grid} calledNumbers={calledNumbers} onClaim={() => claim(i)} />
        ))}
      </div>
    </div>
  );
}
