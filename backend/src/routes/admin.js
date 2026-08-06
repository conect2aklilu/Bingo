const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const gameManager = require('../game/gameManager');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// --- Deposit / withdrawal approval queue ---

router.get('/transactions', async (req, res) => {
  const status = req.query.status || 'pending';
  const result = await pool.query(
    `SELECT t.*, u.username FROM transactions t JOIN users u ON u.id = t.user_id
     WHERE t.status = $1 AND t.type IN ('deposit','withdrawal') ORDER BY t.created_at ASC`,
    [status]
  );
  res.json({ transactions: result.rows });
});

router.post('/transactions/:id/approve', async (req, res) => {
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txResult = await client.query('SELECT * FROM transactions WHERE id = $1 FOR UPDATE', [id]);
    const tx = txResult.rows[0];
    if (!tx || tx.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transaction not found or already processed' });
    }

    if (tx.type === 'deposit') {
      // Deposit funds were sent externally; admin verified reference -> credit wallet now.
      await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [tx.amount, tx.user_id]);
    }
    // Withdrawal: balance was already deducted at request time, nothing more to do
    // besides marking approved (admin sends the money externally).

    await client.query(
      `UPDATE transactions SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2`,
      [req.user.id, id]
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to approve transaction' });
  } finally {
    client.release();
  }
});

router.post('/transactions/:id/reject', async (req, res) => {
  const id = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txResult = await client.query('SELECT * FROM transactions WHERE id = $1 FOR UPDATE', [id]);
    const tx = txResult.rows[0];
    if (!tx || tx.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transaction not found or already processed' });
    }

    if (tx.type === 'withdrawal') {
      // Refund the reserved amount back to the user's wallet.
      await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [tx.amount, tx.user_id]);
    }
    // Deposit rejection: nothing was ever credited, nothing to reverse.

    await client.query(
      `UPDATE transactions SET status = 'rejected', approved_by = $1, approved_at = NOW(), note = $2 WHERE id = $3`,
      [req.user.id, req.body.note || null, id]
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to reject transaction' });
  } finally {
    client.release();
  }
});

// --- Player management ---

router.get('/players', async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, balance, is_banned, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT 200'
  );
  res.json({ players: result.rows });
});

router.post('/players/:id/ban', async (req, res) => {
  await pool.query('UPDATE users SET is_banned = TRUE WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

router.post('/players/:id/unban', async (req, res) => {
  await pool.query('UPDATE users SET is_banned = FALSE WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// --- Games ---

router.post('/games/:stake/force-finish', async (req, res) => {
  try {
    await gameManager.forceFinish(Number(req.params.stake));
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/games/history', async (req, res) => {
  const result = await pool.query(
    `SELECT g.*, u.username AS winner_username FROM games g
     LEFT JOIN users u ON u.id = g.winner_id
     ORDER BY g.created_at DESC LIMIT 100`
  );
  res.json({ games: result.rows });
});

// --- Financial report ---

router.get('/reports/summary', async (req, res) => {
  const deposits = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='deposit' AND status='approved'`);
  const withdrawals = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='withdrawal' AND status='approved'`);
  const fees = await pool.query(`SELECT COALESCE(SUM(platform_fee),0) AS total FROM games WHERE status='finished'`);
  const gamesPlayed = await pool.query(`SELECT COUNT(*) AS count FROM games WHERE status='finished'`);
  const players = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE is_admin = FALSE`);

  res.json({
    totalDeposits: Number(deposits.rows[0].total),
    totalWithdrawals: Number(withdrawals.rows[0].total),
    totalPlatformFees: Number(fees.rows[0].total),
    gamesPlayed: Number(gamesPlayed.rows[0].count),
    totalPlayers: Number(players.rows[0].count),
  });
});

module.exports = router;
