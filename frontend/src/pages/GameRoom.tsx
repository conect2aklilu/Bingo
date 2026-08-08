import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { connectSocket, getSocket } from '../socket';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { isTelegramMiniApp } from '../telegram';
import AppHeader from '../components/AppHeader';
import BingoCard from '../components/BingoCard';

function amharicNumberText(number: number) {
  const names: Record<number, string> = {
    0: 'ሜዳ',
    1: 'አንድ',
    2: 'ሁለት',
    3: 'ሶስት',
    4: 'አራት',
    5: 'አምስት',
    6: 'ስድስት',
    7: 'ሰባት',
    8: 'ስምንት',
    9: 'ዘጠኝ',
    10: 'አስር',
    11: 'አስራ አንድ',
    12: 'አስራ ሁለት',
    13: 'አስራ ሶስት',
    14: 'አስራ አራት',
    15: 'አስራ አምስት',
    16: 'አስራ ስድስት',
    17: 'አስራ ሰባት',
    18: 'አስራ ስምንት',
    19: 'አስራ ዘጠኝ',
    20: 'ሃያ',
    30: 'ሰላሳ',
    40: 'አርባ',
    50: 'ሃምሳ',
    60: 'ስልሳ',
    70: 'ሰባ',
    80: 'ሰማንድ',
    90: 'ዘጠና',
  };
  if (number <= 20 || number % 10 === 0) return names[number] || number.toString();
  const tens = Math.floor(number / 10) * 10;
  const ones = number % 10;
  return `${names[tens]} ${names[ones]}`;
}

function speakNumber(number: number, language: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const text = language === 'am' ? `ቁጥር ${amharicNumberText(number)}` : `Number ${number}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'am' ? 'am-ET' : 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    utterance.voice = voices.find((voice) => voice.lang.startsWith(language === 'am' ? 'am' : 'en')) || voices[0];
  }
  window.speechSynthesis.cancel();
  const callSpeak = () => window.speechSynthesis.speak(utterance);
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = callSpeak;
  } else {
    callSpeak();
  }
}

export default function GameRoom() {
  const { stake } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const { refreshBalance, token } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const telegramMode = isTelegramMiniApp();

  const audioMap = React.useMemo(() => {
    if (typeof window === 'undefined') return {} as Record<number, HTMLAudioElement>;
    const map: Record<number, HTMLAudioElement> = {};
    for (let i = 1; i <= 75; i += 1) {
      const audio = new Audio(`/audio/am/number-${String(i).padStart(2, '0')}.mp3`);
      audio.preload = 'auto';
      map[i] = audio;
    }
    return map;
  }, []);

  const initialCards = (location.state as any)?.cards || [];
  const [cards] = useState<number[][][]>(initialCards);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [status, setStatus] = useState('waiting');
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [latestNumber, setLatestNumber] = useState<number | null>(null);
  const [latestCall, setLatestCall] = useState<string>('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(!telegramMode);

  useEffect(() => {
    setAudioUnlocked(!telegramMode);
  }, [telegramMode]);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket() || connectSocket(token);
    socket.emit('join_table', Number(stake));

    const handleTableState = (t: any) => {
      setStatus(t.status);
      setCalledNumbers(t.calledNumbers || []);
      const countdownEndValue = typeof t.countdownEndsAt === 'number'
        ? t.countdownEndsAt
        : typeof t.countdownEndsAt === 'string'
          ? Number(t.countdownEndsAt)
          : null;
      const validCountdownEndsAt = Number.isFinite(countdownEndValue) ? countdownEndValue : null;
      setCountdownEndsAt(validCountdownEndsAt);

      const serverSeconds = typeof t.countdownSeconds === 'number' ? t.countdownSeconds : NaN;
      const fallbackSeconds = validCountdownEndsAt ? Math.max(0, Math.ceil((validCountdownEndsAt - Date.now()) / 1000)) : NaN;
      const seconds = Number.isFinite(serverSeconds) && serverSeconds >= 0 ? serverSeconds : Number.isFinite(fallbackSeconds) ? fallbackSeconds : 0;
      setCountdownSeconds(seconds);
    };

    const handleNumberCalled = (data: any) => {
      setCalledNumbers(data.calledNumbers);
      setLatestNumber(data.number);
      const number = Number(data.number);
      const letter = ['B', 'I', 'N', 'G', 'O'][Math.floor((number - 1) / 15)] || '';
      setLatestCall(`${letter}-${number}`);
      if (!voiceEnabled) return;

      const audio = audioMap[number];
      if (telegramMode && !audioUnlocked) {
        setMessage('Tap enable audio to hear number calls in Telegram.');
        return;
      }

      if (language === 'am' && audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.load();
        audio.play().catch(() => speakNumber(number, language));
      } else if (language === 'am' && telegramMode) {
        // Use speech synthesis fallback when audio cannot be played in Telegram.
        speakNumber(number, language);
      } else {
        speakNumber(number, language);
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
  }, [stake, token, refreshBalance, language, voiceEnabled, telegramMode, audioUnlocked]);

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
    <div style={{ width: 'min(100%, 900px)', margin: '30px auto', padding: 16 }}>
      <AppHeader
        title={t('brandTitle')}
        subtitle={`${t('table')}: ${stake} Birr`}
        language={language}
        setLanguage={(lang) => setLanguage(lang as any)}
        showLogout
        onLogout={() => window.location.href = '/login'}
        backTo="/lobby"
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        {telegramMode && !audioUnlocked ? (
          <button
            onClick={() => {
              const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
              if (AudioCtx) {
                const ctx = new AudioCtx();
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, ctx.currentTime);
                const osc = ctx.createOscillator();
                osc.connect(gain).connect(ctx.destination);
                osc.start();
                setTimeout(() => {
                  osc.stop();
                  ctx.close();
                  setAudioUnlocked(true);
                }, 50);
              } else {
                setAudioUnlocked(true);
              }
              setVoiceEnabled(true);
            }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #29384a', background: '#f59e0b', color: '#fff', cursor: 'pointer' }}
          >
            Enable Telegram audio
          </button>
        ) : (
          <button
            onClick={() => setVoiceEnabled((prev) => !prev)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #29384a', background: voiceEnabled ? '#0f766e' : '#374151', color: '#fff', cursor: 'pointer' }}
          >
            {voiceEnabled ? '🔊 ድምፅ' : '🔈 ድምፅ'}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: '#111827', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.16)' }}>
          <span style={{ fontSize: 14 }}>{telegramMode ? '📱 Telegram mini app audio mode' : '💻 Web audio mode'}</span>
        </div>
      </div>

      <h2>{t('brandTitle')} — {t('table')}: {stake} Birr</h2>
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
                  {result.winnerUsername ? result.winnerUsername : `User #${result.winnerId}`} completed {result.pattern}
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
          <b>{t('latestNumber')}: {latestCall || latestNumber}</b>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {cards.map((grid, i) => (
          <BingoCard key={i} grid={grid} calledNumbers={calledNumbers} onClaim={() => claim(i)} />
        ))}
      </div>
    </div>
  );
}
