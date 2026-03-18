const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET public player profile + media (no auth required)
router.get('/:userId/public', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileResult = await pool.query(
      `SELECT u.id as user_id, u.email,
              ap.first_name, ap.last_name, ap.age, ap.primary_goal, ap.bio,
              ap.weight_lbs, ap.height_inches, ap.photo_url, ap.school_name,
              ap.gpa, ap.graduation_year
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
