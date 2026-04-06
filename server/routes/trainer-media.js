const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all media from trainer's teams + trainer's own uploads (with optional search/tag filters)
router.get('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { search, tags } = req.query;
    let searchClause = '';
    let tagsClause = '';
    const params = [req.user.id];
    let idx = 2;

    if (search) {
      searchClause = ` AND (m.title ILIKE $${idx} OR m.tags::text ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (tagArray.length > 0) {
        tagsClause = ` AND m.tags @> $${idx}::jsonb`;
        params.push(JSON.stringify(tagArray));
        idx++;
      }
    }

    const result = await pool.query(
      `(SELECT m.*,
              COALESCE(ap.first_name, tp.first_name) as first_name,
              COALESCE(ap.last_name, tp.last_name) as last_name,
              u.email as user_email
        FROM media m
        JOIN team_members tm ON tm.user_id = m.user_id
        JOIN teams t ON t.id = tm.team_id
        JOIN users u ON u.id = m.user_id
        LEFT JOIN athlete_profiles ap ON ap.user_id = m.user_id
        LEFT JOIN trainer_profiles tp ON tp.user_id = m.user_id
        WHERE t.trainer_id = $1${searchClause}${tagsClause})
       UNION ALL
       (SELECT m.*,
              COALESCE(ap.first_name, tp.first_name) as first_name,
              COALESCE(ap.last_name, tp.last_name) as last_name,
              u.email as user_email
        FROM media m
        JOIN users u ON u.id = m.user_id
        LEFT JOIN athlete_profiles ap ON ap.user_id = m.user_id
        LEFT JOIN trainer_profiles tp ON tp.user_id = m.user_id
        WHERE m.user_id = $1${searchClause}${tagsClause})
       ORDER BY created_at DESC`,
      params
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
    const { title, description, url, thumbnail_url, media_type, tags } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const cleanTags = Array.isArray(tags)
      ? [...new Set(tags.map(t => String(t).trim().toLowerCase()).filter(Boolean))]
      : [];

    const result = await pool.query(
      `INSERT INTO media (user_id, title, description, url, thumbnail_url, media_type, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, title || null, description || null, url, thumbnail_url || null, media_type || 'video', JSON.stringify(cleanTags)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

// PATCH update tags on media (own or team member's)
router.patch('/:id/tags', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { tags } = req.body;
    const cleanTags = Array.isArray(tags)
      ? [...new Set(tags.map(t => String(t).trim().toLowerCase()).filter(Boolean))]
      : [];

    const result = await pool.query(
      'UPDATE media SET tags = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(cleanTags), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Media not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

// GET saved analyses for a media item
router.get('/:id/analyses', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM media_analyses WHERE media_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// POST save a new analysis
router.post('/:id/analyses', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { analysis, focus, player_focus, chat_history } = req.body;
    if (!analysis) return res.status(400).json({ error: 'analysis is required' });

    const result = await pool.query(
      `INSERT INTO media_analyses (media_id, user_id, analysis, focus, player_focus, chat_history)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, req.user.id, analysis, focus || null, JSON.stringify(player_focus || null), JSON.stringify(chat_history || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save analysis' });
  }
});

// PATCH update chat_history on an existing analysis
router.patch('/analyses/:analysisId', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { chat_history } = req.body;
    const result = await pool.query(
      'UPDATE media_analyses SET chat_history = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [JSON.stringify(chat_history || []), req.params.analysisId, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Analysis not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update analysis' });
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
