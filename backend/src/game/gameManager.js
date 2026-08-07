const pool = require('../db');
const { generateCards, checkWin } = require('./bingoLogic');

const STAKE_TIERS = (process.env.STAKE_TIERS || '10,50,100,200')
  .split(',')
  .map((s) => Number(s.trim()));
const CALL_INTERVAL_MS = Number(process.env.CALL_INTERVAL_MS || 1500);
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 25);
const COUNTDOWN_SECONDS = 60;
const MIN_PLAYERS_TO_START = 2;

// In-memory table state, keyed by stake. Each table has at most one
// active (non-finished) game at a time.
// { stake: { gameId, status, players: Map<userId, {cards, socketIds:Set}>, calledNumbers:[], countdownTimer, callTimer } }
const tables = new Map();
for (const stake of STAKE_TIERS) {
  tables.set(stake, { stake, gameId: null, status: 'waiting', players: new Map(), calledNumbers: [], countdownTimer: null, callTimer: null, countdownEndsAt: null });
}

let ioRef = null;

function init(io) {
  ioRef = io;
}

function roomName(stake) {
  return `table:${stake}`;
}

function publicTableState(table) {
  return {
    stake: table.stake,
    gameId: table.gameId,
    status: table.status,
    playerCount: table.players.size,
    calledNumbers: table.calledNumbers,
    countdownEndsAt: table.countdownEndsAt,
  };
}

function broadcastTable(stake) {
  const table = tables.get(stake);
  if (!table || !ioRef) return;
  ioRef.to(roomName(stake)).emit('table_state', publicTableState(table));
}

function listTables() {
  return Array.from(tables.values()).map(publicTableState);
}

async function ensureGameRow(table) {
  if (table.gameId) return table.gameId;
  const result = await pool.query(
    `INSERT INTO games (stake, status) VALUES ($1, 'waiting') RETURNING id`,
    [table.stake]
  );
  table.gameId = result.rows[0].id;
  return table.gameId;
}

// Called when a player joins a table (after stake already deducted by the route handler).
async function joinTable(stake, userId, cardCount) {
  const table = tables.get(stake);
  if (!table) throw new Error('Invalid stake tier');
  if (table.status === 'playing') throw new Error('Game already in progress, wait for next round');

  await ensureGameRow(table);
  const cards = generateCards(cardCount);

  await pool.query(
    `INSERT INTO game_players (game_id, user_id, cards) VALUES ($1, $2, $3)
     ON CONFLICT (game_id, user_id) DO UPDATE SET cards = game_players.cards || $3::jsonb`,
    [table.gameId, userId, JSON.stringify(cards)]
  );

  const existing = table.players.get(userId) || { cards: [], socketIds: new Set() };
  existing.cards = existing.cards.concat(cards);
  table.players.set(userId, existing);

  table.status = 'waiting';
  await pool.query(`UPDATE games SET pot = pot + $1 WHERE id = $2`, [stake * cardCount, table.gameId]);

  if (table.players.size >= MIN_PLAYERS_TO_START && !table.countdownTimer) {
    startCountdown(table);
  }

  broadcastTable(stake);
  return { gameId: table.gameId, cards };
}

function startCountdown(table) {
  table.status = 'countdown';
  table.countdownEndsAt = Date.now() + COUNTDOWN_SECONDS * 1000;
  table.countdownTimer = setTimeout(() => startGame(table), COUNTDOWN_SECONDS * 1000);
  broadcastTable(table.stake);
}

async function startGame(table) {
  table.countdownTimer = null;
  if (table.players.size < MIN_PLAYERS_TO_START) {
    table.status = 'waiting';
    broadcastTable(table.stake);
    return;
  }
  table.status = 'playing';
  table.calledNumbers = [];
  await pool.query(`UPDATE games SET status = 'playing', started_at = NOW() WHERE id = $1`, [table.gameId]);
  broadcastTable(table.stake);

  table.callTimer = setInterval(() => callNumber(table), CALL_INTERVAL_MS);
}

async function callNumber(table) {
  const remaining = [];
  for (let n = 1; n <= 75; n++) if (!table.calledNumbers.includes(n)) remaining.push(n);

  if (remaining.length === 0) {
    // All 75 numbers called with no winner: cancel and refund stakes.
    await endGame(table, { winnerId: null, pattern: null, cancelled: true });
    return;
  }

  const next = remaining[Math.floor(Math.random() * remaining.length)];
  table.calledNumbers.push(next);
  await pool.query(`UPDATE games SET called_numbers = array_append(called_numbers, $1) WHERE id = $2`, [next, table.gameId]);

  ioRef.to(roomName(table.stake)).emit('number_called', {
    gameId: table.gameId,
    number: next,
    calledNumbers: table.calledNumbers,
  });
}

// Server-authoritative claim validation.
async function claimBingo(stake, userId, cardIndex) {
  const table = tables.get(stake);
  if (!table || table.status !== 'playing') throw new Error('No active game to claim on this table');

  const player = table.players.get(userId);
  if (!player || !player.cards[cardIndex]) throw new Error('Invalid card');

  const pattern = checkWin(player.cards[cardIndex], table.calledNumbers);
  if (!pattern) {
    return { valid: false };
  }

  await endGame(table, { winnerId: userId, pattern, cancelled: false });
  return { valid: true, pattern };
}

async function endGame(table, { winnerId, pattern, cancelled }) {
  if (table.callTimer) clearInterval(table.callTimer);
  table.callTimer = null;

  const gameId = table.gameId;
  const stake = table.stake;
  const playerCount = table.players.size;
  const pot = stake * Array.from(table.players.values()).reduce((sum, p) => sum + p.cards.length, 0);

  if (cancelled || !winnerId) {
    // Refund every player's stake.
    for (const [userId, p] of table.players.entries()) {
      const refund = stake * p.cards.length;
      await pool.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [refund, userId]);
      await pool.query(
        `INSERT INTO transactions (user_id, type, amount, status, method, note, game_id) VALUES ($1, 'refund', $2, 'completed', 'internal', 'Game cancelled, stake refunded', $3)`,
        [userId, refund, gameId]
      );
    }
    await pool.query(`UPDATE games SET status = 'cancelled', ended_at = NOW() WHERE id = $1`, [gameId]);
    ioRef.to(roomName(stake)).emit('game_over', { gameId, cancelled: true });
  } else {
    const fee = Number((pot * PLATFORM_FEE_PERCENT / 100).toFixed(2));
    const payout = Number((pot - fee).toFixed(2));

    await pool.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [payout, winnerId]);
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, note, game_id) VALUES ($1, 'payout', $2, 'completed', 'internal', $3, $4)`,
      [winnerId, payout, `Bingo win (${pattern})`, gameId]
    );
    await pool.query(
      `UPDATE games SET status = 'finished', winner_id = $1, win_pattern = $2, payout = $3, platform_fee = $4, pot = $5, ended_at = NOW() WHERE id = $6`,
      [winnerId, pattern, payout, fee, pot, gameId]
    );

    ioRef.to(roomName(stake)).emit('game_over', { gameId, winnerId, pattern, payout, platformFee: fee, cancelled: false });
  }

  // Reset table for next round.
  table.gameId = null;
  table.status = 'waiting';
  table.players = new Map();
  table.calledNumbers = [];
  table.countdownEndsAt = null;
  broadcastTable(stake);
}

async function forceFinish(stake) {
  const table = tables.get(stake);
  if (!table) throw new Error('Invalid stake tier');
  await endGame(table, { winnerId: null, pattern: null, cancelled: true });
}

function attachSocket(socket, userId) {
  socket.on('join_table', (stake) => {
    const table = tables.get(Number(stake));
    if (!table) return;
    socket.join(roomName(table.stake));
    const player = table.players.get(userId);
    if (player) player.socketIds.add(socket.id);
    socket.emit('table_state', publicTableState(table));
  });

  socket.on('leave_table', (stake) => {
    socket.leave(roomName(Number(stake)));
  });

  socket.on('claim_bingo', async ({ stake, cardIndex }, ack) => {
    try {
      const result = await claimBingo(Number(stake), userId, cardIndex);
      if (ack) ack(result);
    } catch (err) {
      if (ack) ack({ valid: false, error: err.message });
    }
  });
}

module.exports = {
  init,
  STAKE_TIERS,
  listTables,
  joinTable,
  attachSocket,
  forceFinish,
  tables,
};
