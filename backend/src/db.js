const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isRenderDatabase = Boolean(connectionString && /render\.com|postgres\.render\.com|amazonaws\.com/i.test(connectionString));

const pool = new Pool({
  connectionString,
  ...(isRenderDatabase ? { ssl: { rejectUnauthorized: false } } : {}),
});

module.exports = pool;
