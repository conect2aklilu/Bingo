const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Current balance + recent transaction history
router.get('/me', async (req, res) => {
  const userResult = await pool.query('SELECT id, username, balance FROM users WHERE id = $1', [req.user.id]);
  const txResult = await pool.query(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ user: userResult.rows[0], transactions: txResult.rows });
});

// Submit a deposit request. User has already sent money via bank/mobile-money
// transfer outside the app and provides a reference for the admin to verify.
router.post('/deposit-request', async (req, res) => {
  const { amount, method, reference } = req.body;
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 50) return res.status(400).json({ error: 'Minimum deposit is 50 Birr' });
  if (!method || !reference) return res.status(400).json({ error: 'Payment method and reference are required' });
  if (String(reference).trim().length < 2) return res.status(400).json({ error: 'Reference must be at least 2 characters' });

  const result = await pool.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, reference)
     VALUES ($1, 'deposit', $2, 'pending', $3, $4) RETURNING *`,
    [req.user.id, amt, method, reference]
  );
  res.json({ transaction: result.rows[0] });
});

// Submit a withdrawal request. Funds are reserved immediately (deducted from
// balance) so the user can't double-spend while the admin processes it.
// If rejected, the amount is refunded.
router.post('/withdraw-request', async (req, res) => {
  const { amount, method, account_details } = req.body;
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (amt > 100000) return res.status(400).json({ error: 'Withdrawal amount exceeds the daily limit' });
  if (!method || !account_details) return res.status(400).json({ error: 'Payment method and account details required' });
  if (String(account_details).trim().length < 3) return res.status(400).json({ error: 'Account details must be at least 3 characters' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const balance = Number(userResult.rows[0].balance);
    if (!Number.isFinite(balance) || balance < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid balance state' });
    }
    if (balance < amt) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amt, req.user.id]);
    const txResult = await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, reference)
       VALUES ($1, 'withdrawal', $2, 'pending', $3, $4) RETURNING *`,
      [req.user.id, amt, method, account_details]
    );
    await client.query('COMMIT');
    res.json({ transaction: txResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Withdrawal request failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
