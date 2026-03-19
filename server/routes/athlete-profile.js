const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ap.*, g.name as gym_name, g.city as gym_city, g.state as gym_state,
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
       FROM athlete_profiles ap
       LEFT JOIN gyms g ON ap.gym_id = g.id
       WHERE ap.user_id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const { first_name, last_name, age, weight_lbs, height_inches, primary_goal, bio, photo_url, school_name, gpa, graduation_year } = req.body;

    if (gpa !== undefined && gpa !== null && (parseFloat(gpa) < 0 || parseFloat(gpa) > 5)) {
      return res.status(400).json({ error: 'GPA must be between 0.0 and 5.0' });
    }

    const existing = await pool.query('SELECT id FROM athlete_profiles WHERE user_id = $1', [req.user.id]);

    if (existing.rows[0]) {
      await pool.query(
        `UPDATE athlete_profiles SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          age = COALESCE($3, age),
          weight_lbs = COALESCE($4, weight_lbs),
          height_inches = COALESCE($5, height_inches),
          primary_goal = COALESCE($6, primary_goal),
          bio = COALESCE($7, bio),
          photo_url = CASE WHEN $8::text = '__remove__' THEN NULL ELSE COALESCE($8, photo_url) END,
          school_name = $9,
          gpa = $10,
          graduation_year = $11
        WHERE user_id = $12`,
        [first_name, last_name, age, weight_lbs, height_inches, primary_goal, bio, photo_url || null, school_name || null, gpa ?? null, graduation_year ?? null, req.user.id]
      );
    } else {
      await pool.query(
        `INSERT INTO athlete_profiles (user_id, first_name, last_name, age, weight_lbs, height_inches, primary_goal, bio, photo_url, school_name, gpa, graduation_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [req.user.id, first_name, last_name, age, weight_lbs, height_inches, primary_goal, bio, photo_url || null, school_name || null, gpa ?? null, graduation_year ?? null]
      );
    }

    const profile = await pool.query('SELECT * FROM athlete_profiles WHERE user_id = $1', [req.user.id]);
    res.json(profile.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
