const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ap.*, g.name as gym_name, g.city as gym_city, g.state as gym_state
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
    const { first_name, last_name, gym_id, age, weight_lbs, height_inches, primary_goal, bio, photo_url } = req.body;

    const existing = await pool.query(
      'SELECT id FROM athlete_profiles WHERE user_id = $1',
      [req.user.id]
    );

    let result;
    if (existing.rows[0]) {
      result = await pool.query(
        `UPDATE athlete_profiles SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          gym_id = $3,
          age = COALESCE($4, age),
          weight_lbs = COALESCE($5, weight_lbs),
          height_inches = COALESCE($6, height_inches),
          primary_goal = COALESCE($7, primary_goal),
          bio = COALESCE($8, bio),
          photo_url = CASE WHEN $9::text = '__remove__' THEN NULL ELSE COALESCE($9, photo_url) END
        WHERE user_id = $10
        RETURNING *`,
        [first_name, last_name, gym_id || null, age, weight_lbs, height_inches, primary_goal, bio, photo_url || null, req.user.id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO athlete_profiles (user_id, first_name, last_name, gym_id, age, weight_lbs, height_inches, primary_goal, bio, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [req.user.id, first_name, last_name, gym_id || null, age, weight_lbs, height_inches, primary_goal, bio, photo_url || null]
      );
    }

    const profile = await pool.query(
      `SELECT ap.*, g.name as gym_name FROM athlete_profiles ap LEFT JOIN gyms g ON ap.gym_id = g.id WHERE ap.user_id = $1`,
      [req.user.id]
    );
    res.json(profile.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
