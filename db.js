const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
);

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
```

**2. Go to Vercel Dashboard → Your Backend Project → Settings → Environment Variables** and add all of these:

| Key | Value |
|-----|-------|
| `DB_HOST` | your actual DB host |
| `DB_PORT` | `5432` |
| `DB_NAME` | `smawasis` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | your real password |
| `JWT_SECRET` | a long random string |
| `CLIENT_ORIGIN` | your **frontend** Vercel URL e.g. `https://smasis-62ju-acrr4hr3n-tayo-omgs-projects.vercel.app` |
| `NODE_ENV` | `production` |

**3. If your database is still on `localhost`** — that's the root problem. A Vercel-deployed backend **cannot reach localhost**. You need a hosted database. Free options:
- **[Neon.tech](https://neon.tech)** — free hosted PostgreSQL (easiest, gives you a `DATABASE_URL` directly)
- **[Supabase](https://supabase.com)** — free PostgreSQL with extras
- **[Railway](https://railway.app)** — free tier available

Once you create a Neon/Supabase database, you'll get a connection string like:
```
postgresql://user:password@host/dbname?sslmode=require
