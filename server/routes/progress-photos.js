const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET athlete's own photos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM progress_photos WHERE user_id=$1 ORDER BY taken_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch progress photos' });
  }
});

// POST add progress photo record (photo uploaded to Supabase client-side first)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { photo_url, storage_path, note, weight_lbs, taken_at } = req.body;
    if (!photo_url || !storage_path) {
      return res.status(400).json({ error: 'photo_url and storage_path are required' });
    }
    const result = await pool.query(
      `INSERT INTO progress_photos (user_id, photo_url, storage_path, note, weight_lbs, taken_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.id,
        photo_url,
        storage_path,
        note || null,
        weight_lbs || null,
        taken_at || new Date().toISOString().split('T')[0],
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save progress photo' });
  }
});

// DELETE progress photo record
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM progress_photos WHERE id=$1 AND user_id=$2 RETURNING id, storage_path',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Photo not found' });
    res.json({ success: true, storage_path: result.rows[0].storage_path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete progress photo' });
  }
});

module.exports = router;
