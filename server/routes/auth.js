const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { generateCode, sendVerificationEmail } = require('../utils/email');

const crypto = require('crypto');
const router = express.Router();


const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// In-memory store for one-time auth codes (code → { user data, expiry })
// Codes expire after 60 seconds and are single-use
const authCodes = new Map();

function issueAuthCode(data) {
  const code = crypto.randomBytes(32).toString('hex');
  authCodes.set(code, { ...data, expires: Date.now() + 60_000 });
  return code;
}

function consumeAuthCode(code) {
  const entry = authCodes.get(code);
  if (!entry) return null;
  authCodes.delete(code);
  if (Date.now() > entry.expires) return null;
  return entry;
}

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of authCodes) {
    if (now > entry.expires) authCodes.delete(code);
  }
}, 5 * 60_000);

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
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
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
      // New user — send short-lived code (not the actual token)
      const code = issueAuthCode({ id: user.id, email: user.email, role: null, type: 'setup' });
      return res.redirect(`${FRONTEND_URL}/auth/setup?code=${code}`);
    }
    // Existing user — send short-lived code
    const code = issueAuthCode({ id: user.id, email: user.email, role: user.role, type: 'login' });
    res.redirect(`${FRONTEND_URL}/auth/callback?code=${code}`);
  }
);

// POST /auth/exchange — exchange a one-time code for a JWT token
router.post('/exchange', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const data = consumeAuthCode(code);
  if (!data) return res.status(401).json({ error: 'Invalid or expired code' });

  const token = issueToken({ id: data.id, email: data.email, role: data.role });
  res.json({ token, user: { id: data.id, email: data.email, role: data.role }, type: data.type });
});

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

// POST /auth/register — creates user, sends verification code, returns user without token
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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role, verification_code, verification_expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role',
      [email.toLowerCase(), password_hash, role, code, expiresAt]
    );
    const user = result.rows[0];

    if (role === 'athlete') {
      await pool.query('INSERT INTO athlete_profiles (user_id, first_name) VALUES ($1, $2)', [user.id, email.split('@')[0]]);
    } else {
      await pool.query('INSERT INTO trainer_profiles (user_id, first_name) VALUES ($1, $2)', [user.id, email.split('@')[0]]);
    }

    await sendVerificationEmail(email, code);

    res.status(201).json({ message: 'Verification code sent', userId: user.id, email: user.email, role: user.role });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/verify-email — verify code, mark user as verified, issue token
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const result = await pool.query(
      'SELECT id, email, role, verification_code, verification_expires_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.email_verified) return res.status(400).json({ error: 'Email already verified' });
    if (!user.verification_code || user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    if (new Date() > new Date(user.verification_expires_at)) {
      return res.status(400).json({ error: 'Verification code expired. Please register again.' });
    }

    await pool.query(
      'UPDATE users SET email_verified = TRUE, verification_code = NULL, verification_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    const token = issueToken(user);
    res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /auth/resend-code — resend verification code
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query(
      'SELECT id, email, role, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.email_verified) return res.status(400).json({ error: 'Email already verified' });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      'UPDATE users SET verification_code = $1, verification_expires_at = $2 WHERE id = $3',
      [code, expiresAt, user.id]
    );

    await sendVerificationEmail(email, code);
    res.json({ message: 'Verification code resent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resend code' });
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
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.email_verified) {
      return res.status(403).json({ error: 'Please verify your email first. Check your inbox for the verification code.', unverified: true, email: user.email });
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

router.delete('/account', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete account' });
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
