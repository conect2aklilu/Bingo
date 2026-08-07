import { type FC } from 'react';

const HEADERS = ['B', 'I', 'N', 'G', 'O'];
const COLORS = ['#e11d48', '#2563eb', '#059669', '#d97706', '#7c3aed'];

type BingoCardProps = {
  grid: number[][];
  calledNumbers: number[];
  onClaim?: () => void;
};

const BingoCard: FC<BingoCardProps> = ({
  grid,
  calledNumbers,
  onClaim,
}) => {
  const calledSet = new Set(calledNumbers);
  const isMarked = (v: number) => v === 0 || calledSet.has(v);

  return (
    <div style={{ display: 'inline-block', background: '#1a2432', padding: 10, borderRadius: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 42px)', gap: 4, marginBottom: 4 }}>
        {HEADERS.map((h, i) => (
          <div
            key={h}
            style={{
              textAlign: 'center',
              fontWeight: 700,
              color: COLORS[i],
              fontSize: 18,
            }}
          >
            {h}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 42px)', gridTemplateRows: 'repeat(5, 42px)', gap: 4 }}>
        {grid.map((row, r) =>
          row.map((val, c) => {
            const marked = isMarked(val);
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 14,
                  background: marked ? '#16a34a' : '#0f1720',
                  color: marked ? '#fff' : '#9fb0c3',
                  border: '1px solid #29384a',
                }}
              >
                {val === 0 ? 'FREE' : val}
              </div>
            );
          })
        )}
      </div>
      {onClaim && (
        <button
          onClick={onClaim}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '8px 0',
            background: '#e11d48',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ቢንጎ! Claim
        </button>
      )}
    </div>
  );
};

export default BingoCard;
