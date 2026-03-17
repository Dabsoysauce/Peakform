const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET coach's own events
router.get('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE trainer_id = $1 ORDER BY event_date, event_time',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET a trainer's events (for players who are in one of their teams)
router.get('/trainer/:trainerId', authMiddleware, async (req, res) => {
  try {
    const { trainerId } = req.params;

    if (req.user.id !== trainerId) {
      const access = await pool.query(
        `SELECT 1 FROM team_members tm
         JOIN teams t ON t.id = tm.team_id
         WHERE t.trainer_id = $1 AND tm.user_id = $2`,
        [trainerId, req.user.id]
      );
      if (!access.rows[0]) {
        return res.status(403).json({ error: 'You must join this team to view their schedule' });
      }
    }

    const result = await pool.query(
      'SELECT * FROM events WHERE trainer_id = $1 ORDER BY event_date, event_time',
      [trainerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST create event
router.post('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { title, type, event_date, event_time, location, opponent, notes } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: 'title and event_date required' });

    const result = await pool.query(
      `INSERT INTO events (trainer_id, title, type, event_date, event_time, location, opponent, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, title, type || 'practice', event_date, event_time || null, location || null, opponent || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT update event
router.put('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { title, type, event_date, event_time, location, opponent, notes } = req.body;
    const result = await pool.query(
      `UPDATE events SET title=$1, type=$2, event_date=$3, event_time=$4,
        location=$5, opponent=$6, notes=$7
       WHERE id=$8 AND trainer_id=$9 RETURNING *`,
      [title, type, event_date, event_time || null, location || null, opponent || null, notes || null, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE event
router.delete('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM events WHERE id=$1 AND trainer_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Event not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST share event to all team members as a DM
router.post('/:id/share', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const event = await pool.query(
      'SELECT * FROM events WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!event.rows[0]) return res.status(404).json({ error: 'Event not found' });
    const e = event.rows[0];

    const dateStr = new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    const timeStr = e.event_time ? ` at ${e.event_time.slice(0, 5)}` : '';
    const icon = e.type === 'game' ? '🏀' : '🏋️';
    let content = `${icon} ${e.type.toUpperCase()}: ${e.title}\n📆 ${dateStr}${timeStr}`;
    if (e.location) content += `\n📍 ${e.location}`;
    if (e.opponent) content += `\n⚔️ vs ${e.opponent}`;
    if (e.notes) content += `\n\n📝 ${e.notes}`;

    const members = await pool.query(
      `SELECT DISTINCT tm.user_id FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE t.trainer_id = $1`,
      [req.user.id]
    );

    let sent = 0;
    for (const member of members.rows) {
      try {
        await pool.query(
          'INSERT INTO direct_messages (sender_id, recipient_id, content) VALUES ($1, $2, $3)',
          [req.user.id, member.user_id, content]
        );
        sent++;
      } catch {}
    }

    res.json({ success: true, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to share event' });
  }
});

module.exports = router;
