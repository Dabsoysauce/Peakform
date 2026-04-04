const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all media from trainer's teams + trainer's own uploads
router.get('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      `(SELECT m.*, u.first_name, u.last_name, u.email as user_email
        FROM media m
        JOIN team_members tm ON tm.user_id = m.user_id
        JOIN teams t ON t.id = tm.team_id
        JOIN users u ON u.id = m.user_id
        WHERE t.trainer_id = $1)
       UNION ALL
       (SELECT m.*, u.first_name, u.last_name, u.email as user_email
        FROM media m
        JOIN users u ON u.id = m.user_id
        WHERE m.user_id = $1)
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// POST upload media (trainer's own film)
router.post('/', authMiddleware, requireRole('trainer'), async (req, res) => {
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

// DELETE media (only trainer's own uploads)
router.delete('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM media WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Media not found or not yours' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

module.exports = router;
