-- Merged Bingo: PostgreSQL schema
-- Wallet-based payments only. No blockchain / crypto tables.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
  balance       NUMERIC(14,2) NOT NULL DEFAULT 0,   -- in Birr (or your currency), internal wallet
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per bingo game (a "table" instance)
CREATE TABLE IF NOT EXISTS games (
  id              SERIAL PRIMARY KEY,
  stake           NUMERIC(14,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting | countdown | playing | finished | cancelled
  called_numbers  INTEGER[] NOT NULL DEFAULT '{}',
  pot             NUMERIC(14,2) NOT NULL DEFAULT 0,
  platform_fee    NUMERIC(14,2) NOT NULL DEFAULT 0,
  payout          NUMERIC(14,2) NOT NULL DEFAULT 0,
  winner_id       INTEGER REFERENCES users(id),
  win_pattern     VARCHAR(30),
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Players + their cards within a game (a player may hold 1-4 cards)
CREATE TABLE IF NOT EXISTS game_players (
  id         SERIAL PRIMARY KEY,
  game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  cards      JSONB NOT NULL,          -- array of 5x5 card grids
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, user_id)
);

-- All money movement: stake, payout, deposit, withdrawal, refund
-- Deposits/withdrawals are wallet-based and require admin approval (no blockchain).
CREATE TABLE IF NOT EXISTS transactions (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  type         VARCHAR(20) NOT NULL, -- deposit | withdrawal | stake | payout | refund
  amount       NUMERIC(14,2) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'completed', -- pending | approved | rejected | completed
  reference    TEXT,                  -- e.g. bank/mobile-money transfer reference supplied by user
  method       VARCHAR(30),           -- e.g. 'bank_transfer', 'telebirr', 'cbe', 'internal'
  note         TEXT,
  game_id      INTEGER REFERENCES games(id),
  approved_by  INTEGER REFERENCES users(id),
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
