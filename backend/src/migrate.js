require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_init.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migration applied.');

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [adminUsername]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      'INSERT INTO users (username, password_hash, is_admin, balance) VALUES ($1, $2, TRUE, 0)',
      [adminUsername, hash]
    );
    console.log(`Admin account created: ${adminUsername} / ${adminPassword} (change this password!)`);
  } else {
    console.log('Admin account already exists, skipping.');
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
