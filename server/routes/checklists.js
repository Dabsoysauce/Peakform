const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET trainer's checklists with item count
router.get('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, t.name as team_name, COUNT(ci.id)::int as item_count
       FROM checklists c
       LEFT JOIN teams t ON t.id = c.team_id
       LEFT JOIN checklist_items ci ON ci.checklist_id = c.id
       WHERE c.trainer_id = $1
       GROUP BY c.id, t.name
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch checklists' });
  }
});

// POST create checklist with items
router.post('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { title, team_id, items = [] } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const checklistResult = await client.query(
        `INSERT INTO checklists (trainer_id, team_id, title) VALUES ($1, $2, $3) RETURNING *`,
        [req.user.id, team_id || null, title]
      );
      const checklist = checklistResult.rows[0];
      for (let i = 0; i < items.length; i++) {
        await client.query(
          'INSERT INTO checklist_items (checklist_id, text, sort_order) VALUES ($1, $2, $3)',
          [checklist.id, items[i].text, i]
        );
      }
      await client.query('COMMIT');
      res.status(201).json(checklist);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

// GET single checklist with items + user's completions
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const checklist = await pool.query(
      'SELECT c.*, t.name as team_name FROM checklists c LEFT JOIN teams t ON t.id = c.team_id WHERE c.id=$1',
      [req.params.id]
    );
    if (!checklist.rows[0]) return res.status(404).json({ error: 'Checklist not found' });
    const c = checklist.rows[0];
    const isOwner = c.trainer_id === req.user.id;
    if (!isOwner) {
      if (c.team_id) {
        const isMember = await pool.query(
          'SELECT 1 FROM team_members WHERE team_id=$1 AND user_id=$2',
          [c.team_id, req.user.id]
        );
        if (!isMember.rows[0]) return res.status(403).json({ error: 'Access denied' });
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    const items = await pool.query(
      `SELECT ci.*,
              CASE WHEN cc.id IS NOT NULL THEN true ELSE false END as completed
       FROM checklist_items ci
       LEFT JOIN checklist_completions cc ON cc.item_id = ci.id AND cc.user_id = $1
       WHERE ci.checklist_id = $2
       ORDER BY ci.sort_order ASC`,
      [req.user.id, req.params.id]
    );
    res.json({ ...c, items: items.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

// PUT edit checklist
router.put('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { title, team_id } = req.body;
    const result = await pool.query(
      'UPDATE checklists SET title=$1, team_id=$2 WHERE id=$3 AND trainer_id=$4 RETURNING *',
      [title, team_id || null, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Checklist not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// DELETE checklist
router.delete('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM checklists WHERE id=$1 AND trainer_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Checklist not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
});

// POST add item
router.post('/:id/items', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const checklist = await pool.query(
      'SELECT id FROM checklists WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!checklist.rows[0]) return res.status(404).json({ error: 'Checklist not found' });
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const countRes = await pool.query(
      'SELECT COUNT(*)::int as cnt FROM checklist_items WHERE checklist_id=$1',
      [req.params.id]
    );
    const result = await pool.query(
      'INSERT INTO checklist_items (checklist_id, text, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, text, countRes.rows[0].cnt]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PUT edit item text
router.put('/:id/items/:itemId', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const checklist = await pool.query(
      'SELECT id FROM checklists WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!checklist.rows[0]) return res.status(404).json({ error: 'Checklist not found' });
    const { text } = req.body;
    const result = await pool.query(
      'UPDATE checklist_items SET text=$1 WHERE id=$2 AND checklist_id=$3 RETURNING *',
      [text, req.params.itemId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE remove item
router.delete('/:id/items/:itemId', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const checklist = await pool.query(
      'SELECT id FROM checklists WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!checklist.rows[0]) return res.status(404).json({ error: 'Checklist not found' });
    const result = await pool.query(
      'DELETE FROM checklist_items WHERE id=$1 AND checklist_id=$2 RETURNING id',
      [req.params.itemId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// POST toggle completion
router.post('/:id/items/:itemId/complete', authMiddleware, async (req, res) => {
  try {
    const checklist = await pool.query(
      'SELECT * FROM checklists WHERE id=$1',
      [req.params.id]
    );
    if (!checklist.rows[0]) return res.status(404).json({ error: 'Checklist not found' });
    const c = checklist.rows[0];
    const isOwner = c.trainer_id === req.user.id;
    if (!isOwner) {
      if (c.team_id) {
        const isMember = await pool.query(
          'SELECT 1 FROM team_members WHERE team_id=$1 AND user_id=$2',
          [c.team_id, req.user.id]
        );
        if (!isMember.rows[0]) return res.status(403).json({ error: 'Access denied' });
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    const { completed } = req.body;
    if (completed) {
      await pool.query(
        'INSERT INTO checklist_completions (item_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.itemId, req.user.id]
      );
    } else {
      await pool.query(
        'DELETE FROM checklist_completions WHERE item_id=$1 AND user_id=$2',
        [req.params.itemId, req.user.id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle completion' });
  }
});

// GET progress (trainer only)
router.get('/:id/progress', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const checklist = await pool.query(
      'SELECT * FROM checklists WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!checklist.rows[0]) return res.status(404).json({ error: 'Checklist not found' });
    const items = await pool.query(
      `SELECT ci.id, ci.text, ci.sort_order,
              COALESCE(
                json_agg(
                  json_build_object('user_id', cc.user_id, 'first_name', ap.first_name, 'last_name', ap.last_name, 'completed_at', cc.completed_at)
                  ORDER BY cc.completed_at
                ) FILTER (WHERE cc.id IS NOT NULL),
                '[]'
              ) as completions
       FROM checklist_items ci
       LEFT JOIN checklist_completions cc ON cc.item_id = ci.id
       LEFT JOIN athlete_profiles ap ON ap.user_id = cc.user_id
       WHERE ci.checklist_id = $1
       GROUP BY ci.id
       ORDER BY ci.sort_order ASC`,
      [req.params.id]
    );
    res.json(items.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

module.exports = router;
