const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tp.*, g.name as gym_name, g.city as gym_city, g.state as gym_state
       FROM trainer_profiles tp
       LEFT JOIN gyms g ON tp.gym_id = g.id
       WHERE tp.user_id = $1`,
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
    const { first_name, last_name, specialty, certifications, bio, photo_url, school_name } = req.body;

    const existing = await pool.query('SELECT id FROM trainer_profiles WHERE user_id = $1', [req.user.id]);

    if (existing.rows[0]) {
      await pool.query(
        `UPDATE trainer_profiles SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          specialty = COALESCE($3, specialty),
          certifications = COALESCE($4, certifications),
          bio = COALESCE($5, bio),
          photo_url = CASE WHEN $6::text = '__remove__' THEN NULL ELSE COALESCE($6, photo_url) END,
          school_name = $7
        WHERE user_id = $8`,
        [first_name, last_name, specialty, certifications, bio, photo_url || null, school_name || null, req.user.id]
      );
    } else {
      await pool.query(
        `INSERT INTO trainer_profiles (user_id, first_name, last_name, specialty, certifications, bio, photo_url, school_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.user.id, first_name, last_name, specialty, certifications, bio, photo_url || null, school_name || null]
      );
    }

    const profile = await pool.query('SELECT * FROM trainer_profiles WHERE user_id = $1', [req.user.id]);
    res.json(profile.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
