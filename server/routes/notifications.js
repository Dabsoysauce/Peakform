const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/notifications — list notifications for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE`,
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

module.exports = router;
