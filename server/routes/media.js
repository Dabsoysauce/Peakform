const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET own media
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM media WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// POST upload media
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, url, thumbnail_url, media_type } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const result = await pool.query(
      `INSERT INTO media (user_id, title, description, url, thumbnail_url, media_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, title || null, description || null, url, thumbnail_url || null, media_type || 'video']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

// GET a player's media (coaches only — player must be on one of the trainer's teams)
router.get('/player/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'trainer') return res.status(403).json({ error: 'Coaches only' });

    // Verify the player is on at least one team owned by this trainer
    const membership = await pool.query(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.trainer_id = $2
       LIMIT 1`,
      [req.params.userId, req.user.id]
    );
    if (!membership.rows[0]) {
      return res.status(403).json({ error: 'Player is not on any of your teams' });
    }

    const result = await pool.query(
      'SELECT * FROM media WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// DELETE media
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM media WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Media not found' });
    res.json({ message: 'Media deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

module.exports = router;
