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
              u.role as sender_role
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

module.exports = router;
