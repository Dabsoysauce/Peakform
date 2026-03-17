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
    const { first_name, last_name, gym_id, specialty, certifications, bio, photo_url } = req.body;

    const existing = await pool.query(
      'SELECT id FROM trainer_profiles WHERE user_id = $1',
      [req.user.id]
    );

    let result;
    if (existing.rows[0]) {
      result = await pool.query(
        `UPDATE trainer_profiles SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          gym_id = $3,
          specialty = COALESCE($4, specialty),
          certifications = COALESCE($5, certifications),
          bio = COALESCE($6, bio),
          photo_url = COALESCE($7, photo_url)
        WHERE user_id = $8
        RETURNING *`,
        [first_name, last_name, gym_id || null, specialty, certifications, bio, photo_url || null, req.user.id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO trainer_profiles (user_id, first_name, last_name, gym_id, specialty, certifications, bio, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.id, first_name, last_name, gym_id || null, specialty, certifications, bio, photo_url || null]
      );
    }

    const profile = await pool.query(
      `SELECT tp.*, g.name as gym_name FROM trainer_profiles tp LEFT JOIN gyms g ON tp.gym_id = g.id WHERE tp.user_id = $1`,
      [req.user.id]
    );
    res.json(profile.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
