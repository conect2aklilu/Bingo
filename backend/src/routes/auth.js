const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyTelegramAuth(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return computedHash === hash ? params : null;
}

router.post('/telegram/auth', async (req, res) => {
  const { initData, username, password } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return res.status(500).json({ error: 'Telegram bot token is not configured' });
  }

  const verified = verifyTelegramAuth(initData, botToken);
  if (!verified) {
    return res.status(401).json({ error: 'Invalid Telegram init data' });
  }

  const userParam = verified.get('user');
  if (!userParam) {
    return res.status(400).json({ error: 'Telegram user data missing' });
  }

  let telegramUser;
  try {
    telegramUser = JSON.parse(userParam);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid Telegram user payload' });
  }

  const telegramId = telegramUser.id;
  const telegramUsername = `tg_${telegramId}`;

  try {
    const existing = await pool.query('SELECT * FROM users WHERE username = $1', [telegramUsername]);
    let user = existing.rows[0];

    if (!user) {
      const starting = Number(process.env.STARTING_VIRTUAL_BALANCE || 0);
      const created = await pool.query(
        `INSERT INTO users (username, password_hash, balance) VALUES ($1, $2, $3) RETURNING id, username, is_admin, balance`,
        [telegramUsername, bcrypt.hashSync(String(telegramId), 10), starting]
      );
      user = created.rows[0];
    }

    if (username && password) {
      await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username, user.id]);
    }

    res.json({
      token: signToken(user),
      user: { id: user.id, username: user.username, is_admin: user.is_admin, balance: user.balance },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Telegram auth failed' });
  }
});

router.post('/register', async (req, res) => {
  const { username, password, telegram } = req.body;
  const isTelegram = Boolean(telegram?.id);

  if (!username || !password || password.length < 6) {
    if (!isTelegram) {
      return res.status(400).json({ error: 'Username and password (min 6 chars) required' });
    }
  }

  try {
    if (isTelegram) {
      const telegramUsername = `tg_${telegram.id}`;
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', [telegramUsername]);
      if (existing.rows.length > 0) {
        const user = existing.rows[0];
        return res.json({ token: signToken({ id: user.id, username: telegramUsername, is_admin: false }), user: { id: user.id, username: telegramUsername, is_admin: false, balance: 0 } });
      }

      const starting = Number(process.env.STARTING_VIRTUAL_BALANCE || 0);
      const result = await pool.query(
        `INSERT INTO users (username, password_hash, balance) VALUES ($1, $2, $3)
         RETURNING id, username, is_admin, balance`,
        [telegramUsername, bcrypt.hashSync(String(telegram.id), 10), starting]
      );
      const user = result.rows[0];
      return res.json({ token: signToken(user), user });
    }

    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 10);
    const starting = Number(process.env.STARTING_VIRTUAL_BALANCE || 0);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, balance) VALUES ($1, $2, $3)
       RETURNING id, username, is_admin, balance`,
      [username, hash, starting]
    );
    const user = result.rows[0];
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password, telegram } = req.body;
  const isTelegram = Boolean(telegram?.id);

  try {
    if (isTelegram) {
      const telegramUsername = `tg_${telegram.id}`;
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [telegramUsername]);
      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ error: 'Telegram account not found' });
      }
      if (user.is_banned) return res.status(403).json({ error: 'Account is banned' });

      return res.json({
        token: signToken(user),
        user: { id: user.id, username: user.username, is_admin: user.is_admin, balance: user.balance },
      });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    if (user.is_banned) return res.status(403).json({ error: 'Account is banned' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

    res.json({
      token: signToken(user),
      user: { id: user.id, username: user.username, is_admin: user.is_admin, balance: user.balance },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
