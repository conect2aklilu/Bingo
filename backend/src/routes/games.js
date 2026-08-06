const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const gameManager = require('../game/gameManager');

const router = express.Router();
router.use(requireAuth);

router.get('/tables', (req, res) => {
  res.json({ tables: gameManager.listTables() });
});

// Join a stake table with 1-4 cards. Stake is deducted from the wallet
// balance up front; refunded automatically if the round is cancelled.
router.post('/:stake/join', async (req, res) => {
  const stake = Number(req.params.stake);
  const cardCount = Math.min(4, Math.max(1, Number(req.body.cardCount) || 1));

  if (!gameManager.STAKE_TIERS.includes(stake)) {
    return res.status(400).json({ error: 'Invalid stake tier' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const balance = Number(userResult.rows[0].balance);
    const total = stake * cardCount;
    if (balance < total) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance. Please deposit funds.' });
    }
    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [total, req.user.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'Failed to join table' });
  } finally {
    client.release();
  }

  try {
    const { gameId, cards } = await gameManager.joinTable(stake, req.user.id, cardCount);
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, note, game_id) VALUES ($1, 'stake', $2, 'completed', 'internal', 'Joined bingo table', $3)`,
      [req.user.id, stake * cardCount, gameId]
    );
    res.json({ gameId, cards, cardCount });
  } catch (err) {
    // Refund if joining the table itself failed after balance was deducted.
    await pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [stake * cardCount, req.user.id]);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
