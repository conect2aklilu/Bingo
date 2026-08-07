import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { connectSocket, getSocket } from '../socket';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BingoCard from '../components/BingoCard';

export default function GameRoom() {
  const { stake } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const { refreshBalance, token } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const initialCards = (location.state as any)?.cards || [];
  const [cards] = useState<number[][][]>(initialCards);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [status, setStatus] = useState('waiting');
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [latestNumber, setLatestNumber] = useState<number | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket() || connectSocket(token);
    socket.emit('join_table', Number(stake));

    const handleTableState = (t: any) => {
      setStatus(t.status);
      setCalledNumbers(t.calledNumbers || []);
      setCountdownEndsAt(t.countdownEndsAt || null);
      if (t.status === 'countdown' && t.countdownEndsAt) {
        setCountdownSeconds(Math.max(0, Math.ceil((t.countdownEndsAt - Date.now()) / 1000)));
      } else {
        setCountdownSeconds(0);
      }
    };

    const handleNumberCalled = (data: any) => {
      setCalledNumbers(data.calledNumbers);
      setLatestNumber(data.number);
      if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.number.toString());
        utterance.lang = 'am-ET';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
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
  }, [stake, token, refreshBalance, language, voiceEnabled]);

  useEffect(() => {
    if (status !== 'countdown' || !countdownEndsAt) return;
    const timer = window.setInterval(() => {
      setCountdownSeconds(Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, countdownEndsAt]);

  function claim(cardIndex: number) {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('claim_bingo', { stake: Number(stake), cardIndex }, (res: any) => {
      if (!res.valid) {
        setMessage(res.error || t('winningMessage'));
        setTimeout(() => setMessage(''), 3000);
      }
    });
  }

  return (
    <div style={{ maxWidth: 900, margin: '30px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => nav('/lobby')} style={{ background: 'none', border: '1px solid #29384a', color: '#eef2f6', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>
          {t('backToLobby')}
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setVoiceEnabled((prev) => !prev)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #29384a', background: voiceEnabled ? '#0f766e' : '#374151', color: '#fff', cursor: 'pointer' }}
          >
            {voiceEnabled ? '🔊 ድምፅ' : '🔈 ድምፅ'}
          </button>
          <select value={language} onChange={(e) => setLanguage(e.target.value as any)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #29384a', background: '#0f1720', color: '#eef2f6' }}>
            <option value="en">English</option>
            <option value="am">አማርኛ</option>
          </select>
        </div>
      </div>

      <h2>{t('brand')} — {t('table')}: {stake} Birr</h2>
      <p>{t('status')}: <b>{status}</b></p>

      {status === 'countdown' && countdownEndsAt && (
        <div style={{ background: '#111827', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <b>{t('gameStartsIn')} {countdownSeconds} {t('seconds')}</b>
        </div>
      )}

      {message && <div style={{ color: '#fbbf24', marginBottom: 10 }}>{message}</div>}

      {result && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'linear-gradient(135deg, #0f766e, #2563eb)', padding: 24, borderRadius: 16, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
            {result.cancelled ? (
              <h2 style={{ margin: '0 0 8px' }}>Round cancelled</h2>
            ) : (
              <>
                <h2 style={{ margin: '0 0 8px' }}>Winner!</h2>
                <p style={{ margin: '0 0 8px', fontSize: 18 }}>
                  User #{result.winnerId} completed {result.pattern}
                </p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                  Payout: {result.payout} Birr
                </p>
              </>
            )}
            <button onClick={() => setResult(null)} style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#fff', color: '#0f1720', fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {latestNumber !== null && (
        <div style={{ marginBottom: 10, background: '#0f766e', padding: 10, borderRadius: 8 }}>
          <b>{t('latestNumber')}: {latestNumber}</b>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <b>{t('calledNumbers')} ({calledNumbers.length}/75):</b>
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
