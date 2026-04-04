const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all media from trainer's teams
router.get('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.first_name, u.last_name, u.email as user_email
       FROM media m
       JOIN team_members tm ON tm.user_id = m.user_id
       JOIN teams t ON t.id = tm.team_id
       JOIN users u ON u.id = m.user_id
       WHERE t.trainer_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

module.exports = router;
