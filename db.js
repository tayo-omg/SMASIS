const { Pool } = require('pg');

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.error('FATAL: No database config found. Set DATABASE_URL in Vercel env vars.');
  process.exit(1);
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
      }
);

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
