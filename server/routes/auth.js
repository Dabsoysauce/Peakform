const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Resend } = require('resend');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, code) {
  await resend.emails.send({
    from: 'PeakForm <onboarding@resend.dev>',
    to: email,
    subject: 'Your PeakForm verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f1a;color:#fff;border-radius:16px;">
        <h1 style="color:#2563eb;margin-bottom:8px;">PEAKFORM</h1>
        <h2 style="margin-bottom:16px;">Verify your email</h2>
        <p style="color:#9ca3af;margin-bottom:24px;">Enter this code to complete your registration:</p>
        <div style="background:#1e1e30;border:1px solid #374151;border-radius:12px;padding:24px;text-align:center;letter-spacing:12px;font-size:36px;font-weight:900;color:#fff;margin-bottom:24px;">${code}</div>
        <p style="color:#6b7280;font-size:13px;">This code expires in 15 minutes. If you didn't sign up for PeakForm, ignore this email.</p>
      </div>
    `,
  });
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://peakform-yapx.onrender.com/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value.toLowerCase();
    const googleId = profile.id;

    // Check if user exists by google_id or email
    let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    if (result.rows[0]) return done(null, result.rows[0]);

    result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows[0]) {
      // Link google_id to existing account
      await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, result.rows[0].id]);
      return done(null, result.rows[0]);
    }

    // New user — create without role (will be set on setup page)
    const newUser = await pool.query(
      'INSERT INTO users (email, google_id, role) VALUES ($1, $2, $3) RETURNING *',
      [email, googleId, null]
    );
    return done(null, { ...newUser.rows[0], isNew: true });
  } catch (err) {
    return done(err);
  }
}));

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google` }),
  async (req, res) => {
    const user = req.user;
    if (!user.role) {
      // New user — send to role setup
      const tempToken = issueToken({ id: user.id, email: user.email, role: null });
      return res.redirect(`${FRONTEND_URL}/auth/setup?token=${tempToken}&email=${encodeURIComponent(user.email)}`);
    }
    const token = issueToken(user);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&userId=${user.id}&role=${user.role}&email=${encodeURIComponent(user.email)}`);
  }
);

// PUT /auth/role — set role for new Google users
router.put('/role', authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['athlete', 'trainer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.user.id]);

    // Create profile
    if (role === 'athlete') {
      await pool.query(
        'INSERT INTO athlete_profiles (user_id, first_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, req.user.email.split('@')[0]]
      );
    } else {
      await pool.query(
        'INSERT INTO trainer_profiles (user_id, first_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, req.user.email.split('@')[0]]
      );
    }

    const updated = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [req.user.id]);
    const user = updated.rows[0];
    const token = issueToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set role' });
  }
});

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
    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, email_verified, verification_code, verification_code_expires_at)
       VALUES ($1, $2, $3, false, $4, $5) RETURNING id, email, role`,
      [email.toLowerCase(), password_hash, role, code, expires]
    );
    const user = result.rows[0];

    if (role === 'athlete') {
      await pool.query('INSERT INTO athlete_profiles (user_id, first_name) VALUES ($1, $2)', [user.id, email.split('@')[0]]);
    } else {
      await pool.query('INSERT INTO trainer_profiles (user_id, first_name) VALUES ($1, $2)', [user.id, email.split('@')[0]]);
    }

    await sendVerificationEmail(email.toLowerCase(), code);
    res.status(201).json({ pendingVerification: true, email: email.toLowerCase() });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/verify — verify email code
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email_verified) return res.status(400).json({ error: 'Email already verified' });
    if (user.verification_code !== code) return res.status(400).json({ error: 'Invalid code' });
    if (new Date() > new Date(user.verification_code_expires_at)) {
      return res.status(400).json({ error: 'Code expired — request a new one' });
    }

    await pool.query(
      'UPDATE users SET email_verified = true, verification_code = NULL, verification_code_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    const token = issueToken(user);
    res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /auth/resend — resend verification code
router.post('/resend', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user || user.email_verified) return res.status(400).json({ error: 'Cannot resend' });

    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query(
      'UPDATE users SET verification_code = $1, verification_code_expires_at = $2 WHERE id = $3',
      [code, expires, user.id]
    );
    await sendVerificationEmail(email.toLowerCase(), code);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resend' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await pool.query(
      'SELECT id, email, password_hash, role, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.email_verified) {
      return res.status(403).json({ error: 'Email not verified', pendingVerification: true, email: user.email });
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
