const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

// GET public player profile + media (no auth required)
router.get('/:userId/public', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileResult = await pool.query(
      `SELECT u.id as user_id, u.email,
              ap.first_name, ap.last_name, ap.age, ap.primary_goal, ap.bio,
              ap.weight_lbs, ap.height_inches, ap.photo_url, ap.school_name,
              ap.gpa, ap.graduation_year,
       (WITH dates AS (
         SELECT DISTINCT session_date::date AS d FROM workout_sessions
         WHERE user_id = $1 AND session_date <= CURRENT_DATE
       ),
       anchor AS (
         SELECT CASE WHEN MAX(d) = CURRENT_DATE THEN CURRENT_DATE
                     WHEN MAX(d) = CURRENT_DATE - 1 THEN CURRENT_DATE - 1
                     ELSE NULL END AS s FROM dates
       ),
       ranked AS (
         SELECT (anchor.s - d) AS days_ago,
                ROW_NUMBER() OVER (ORDER BY d DESC) - 1 AS rn
         FROM dates, anchor WHERE anchor.s IS NOT NULL
       )
       SELECT COALESCE(COUNT(*), 0) FROM ranked WHERE days_ago = rn) AS workout_streak
       FROM users u
       JOIN athlete_profiles ap ON ap.user_id = u.id
       WHERE u.id = $1 AND u.role = 'athlete'`,
      [userId]
    );
    if (!profileResult.rows[0]) return res.status(404).json({ error: 'Player not found' });

    const mediaResult = await pool.query(
      'SELECT * FROM media WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ profile: profileResult.rows[0], media: mediaResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch player profile' });
  }
});

// POST /:userId/view — record a coach viewing a player's profile
router.post('/:userId/view', async (req, res) => {
  try {
    const { userId } = req.params;

    // Extract JWT from Authorization header if present
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.sendStatus(204);

    let viewer;
    try {
      viewer = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.sendStatus(204);
    }

    // Only record if viewer is a coach
    if (viewer.role !== 'trainer') return res.sendStatus(204);

    // Don't record if coach is viewing their own... (irrelevant but safe)
    if (viewer.id === userId) return res.sendStatus(204);

    // Deduplicate: skip if same coach viewed this player in the last 24 hours
    const recent = await pool.query(
      `SELECT id FROM profile_views
       WHERE viewer_id = $1 AND player_id = $2
         AND viewed_at > NOW() - INTERVAL '24 hours'`,
      [viewer.id, userId]
    );
    if (recent.rows.length > 0) return res.sendStatus(204);

    // Record the view
    await pool.query(
      `INSERT INTO profile_views (viewer_id, player_id) VALUES ($1, $2)`,
      [viewer.id, userId]
    );

    // Get coach name for the notification message
    const coachResult = await pool.query(
      `SELECT tp.first_name, tp.last_name, tp.school_name
       FROM trainer_profiles tp WHERE tp.user_id = $1`,
      [viewer.id]
    );
    const coach = coachResult.rows[0];
    const coachName = coach?.first_name
      ? `${coach.first_name} ${coach.last_name || ''}`.trim()
      : viewer.email;
    const schoolPart = coach?.school_name ? ` from ${coach.school_name}` : '';

    // Create notification for the player
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, data)
       VALUES ($1, 'profile_view', $2, $3)`,
      [
        userId,
        `Coach ${coachName}${schoolPart} viewed your profile`,
        JSON.stringify({ viewer_id: viewer.id, coach_name: coachName, school_name: coach?.school_name || null }),
      ]
    );

    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.sendStatus(204); // always succeed silently
  }
});

// GET search athletes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { gym, search } = req.query;
    let query = `
      SELECT u.id, u.id as user_id, u.email,
             ap.first_name, ap.last_name, ap.age, ap.primary_goal, ap.bio, ap.photo_url, ap.school_name
      FROM users u
      JOIN athlete_profiles ap ON ap.user_id = u.id
      WHERE u.role = 'athlete'
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (LOWER(ap.first_name) LIKE LOWER($${params.length})
                   OR LOWER(ap.last_name) LIKE LOWER($${params.length})
                   OR LOWER(u.email) LIKE LOWER($${params.length})
                   OR LOWER(ap.school_name) LIKE LOWER($${params.length}))`;
    }

    query += ' ORDER BY ap.first_name, ap.last_name LIMIT 50';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search athletes' });
  }
});

module.exports = router;
