const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET messages for team
router.get('/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (!team.rows[0]) return res.status(404).json({ error: 'Team not found' });

    const isMember = await pool.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    const isTrainer = team.rows[0].trainer_id === req.user.id;
    if (!isTrainer && !isMember.rows[0]) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await pool.query(
      `SELECT m.*,
              COALESCE(ap.first_name || ' ' || ap.last_name, tp.first_name || ' ' || tp.last_name, u.email) as sender_name,
              u.role as sender_role,
              COALESCE(
                (SELECT json_agg(json_build_object('emoji', r.emoji, 'count', r.cnt, 'user_ids', r.user_ids))
                 FROM (
                   SELECT emoji, COUNT(*) as cnt, array_agg(user_id::text) as user_ids
                   FROM message_reactions
                   WHERE message_id = m.id
                   GROUP BY emoji
                 ) r
                ), '[]'
              ) as reactions
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
       LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
       WHERE m.team_id = $1
       ORDER BY m.created_at ASC`,
      [teamId]
    );
    res.json(messages.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST message to team
router.post('/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });

    const team = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (!team.rows[0]) return res.status(404).json({ error: 'Team not found' });

    const isMember = await pool.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    const isTrainer = team.rows[0].trainer_id === req.user.id;
    if (!isTrainer && !isMember.rows[0]) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (team.rows[0].coach_only && !isTrainer) {
      return res.status(403).json({ error: 'Only the trainer can post in this team' });
    }

    const result = await pool.query(
      'INSERT INTO messages (team_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [teamId, req.user.id, content.trim()]
    );
    const msg = result.rows[0];

    const senderInfo = await pool.query(
      `SELECT COALESCE(ap.first_name || ' ' || ap.last_name, tp.first_name || ' ' || tp.last_name, u.email) as sender_name, u.role as sender_role
       FROM users u
       LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
       LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    const fullMsg = { ...msg, ...senderInfo.rows[0] };
    res.status(201).json(fullMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /:teamId/react/:messageId — toggle a reaction
router.post('/:teamId/react/:messageId', authMiddleware, async (req, res) => {
  try {
    const { teamId, messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'emoji is required' });

    const ALLOWED = ['❤️', '👍', '😂', '🔥', '😮'];
    if (!ALLOWED.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' });

    // Verify user has access to this team
    const team = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    if (!team.rows[0]) return res.status(404).json({ error: 'Team not found' });
    const isMember = await pool.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    const isTrainer = team.rows[0].trainer_id === req.user.id;
    if (!isTrainer && !isMember.rows[0]) return res.status(403).json({ error: 'Access denied' });

    // Toggle: delete if exists, insert if not
    const existing = await pool.query(
      'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, req.user.id, emoji]
    );
    if (existing.rows[0]) {
      await pool.query('DELETE FROM message_reactions WHERE id = $1', [existing.rows[0].id]);
    } else {
      await pool.query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
        [messageId, req.user.id, emoji]
      );
    }

    // Return updated reactions for this message
    const updated = await pool.query(
      `SELECT emoji, COUNT(*) as count, array_agg(user_id::text) as user_ids
       FROM message_reactions WHERE message_id = $1
       GROUP BY emoji`,
      [messageId]
    );
    res.json({ messageId, reactions: updated.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to react' });
  }
});

module.exports = router;
