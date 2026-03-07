const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { issueToken, verifyJWT } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, role, team_id } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name, email, password, and role are required' });
  }
  if (!['citizen', 'contractor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'role must be citizen, contractor, or admin' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'password must be at least 6 characters' });
  }

  try {
    // Check for duplicate email
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'CONFLICT', message: 'Email already registered' });
    }

    // Hash password (bcrypt cost factor 12 per SEC-03)
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, team_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, team_id, created_at`,
      [name, email.toLowerCase(), password_hash, role, team_id || null]
    );

    const user = result.rows[0];
    const token = issueToken(user);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, team_id: user.team_id }
    });
  } catch (err) {
    console.error('[AUTH] register error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Registration failed' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'email and password are required' });
  }

  try {
    const result = await db.query(
      'SELECT id, name, email, password_hash, role, team_id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
    }

    const token = issueToken(user);
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, team_id: user.team_id }
    });
  } catch (err) {
    console.error('[AUTH] login error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Login failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', verifyJWT, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, team_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[AUTH] me error:', err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not retrieve profile' });
  }
});

module.exports = router;
