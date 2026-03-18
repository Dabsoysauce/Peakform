const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM plays WHERE trainer_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch plays' });
  }
});

router.post('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { name, canvas_json } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await pool.query(
      'INSERT INTO plays (trainer_id, name, canvas_json) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, canvas_json || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save play' });
  }
});

router.put('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { name, canvas_json } = req.body;
    const result = await pool.query(
      'UPDATE plays SET name=$1, canvas_json=$2 WHERE id=$3 AND trainer_id=$4 RETURNING *',
      [name, canvas_json || null, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Play not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update play' });
  }
});

router.delete('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM plays WHERE id=$1 AND trainer_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Play not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete play' });
  }
});

module.exports = router;
