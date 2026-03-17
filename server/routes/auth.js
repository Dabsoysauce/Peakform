const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }
    if (!['athlete', 'trainer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be athlete or trainer' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
      [email.toLowerCase(), password_hash, role]
    );
    const user = result.rows[0];

    if (role === 'athlete') {
      await pool.query(
        'INSERT INTO athlete_profiles (user_id, first_name) VALUES ($1, $2)',
        [user.id, email.split('@')[0]]
      );
    } else {
      await pool.query(
        'INSERT INTO trainer_profiles (user_id, first_name) VALUES ($1, $2)',
        [user.id, email.split('@')[0]]
      );
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'athlete') {
      const profile = await pool.query(
        `SELECT ap.*, g.name as gym_name, g.city as gym_city, g.state as gym_state
         FROM athlete_profiles ap
         LEFT JOIN gyms g ON ap.gym_id = g.id
         WHERE ap.user_id = $1`,
        [user.id]
      );
      user.profile = profile.rows[0] || null;
    } else {
      const profile = await pool.query(
        `SELECT tp.*, g.name as gym_name, g.city as gym_city, g.state as gym_state
         FROM trainer_profiles tp
         LEFT JOIN gyms g ON tp.gym_id = g.id
         WHERE tp.user_id = $1`,
        [user.id]
      );
      user.profile = profile.rows[0] || null;
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
