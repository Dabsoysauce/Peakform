const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

// GET depth chart for a team
router.get('/team/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await pool.query('SELECT * FROM teams WHERE id=$1', [teamId]);
    if (!team.rows[0]) return res.status(404).json({ error: 'Team not found' });

    const isTrainer = team.rows[0].trainer_id === req.user.id;
    if (!isTrainer) {
      const isMember = await pool.query(
        'SELECT 1 FROM team_members WHERE team_id=$1 AND user_id=$2',
        [teamId, req.user.id]
      );
      if (!isMember.rows[0]) return res.status(403).json({ error: 'Access denied' });
    }

    const entries = await pool.query(
      `SELECT dce.id, dce.user_id, dce.position, dce.depth_order,
              ap.first_name, ap.last_name, ap.photo_url
       FROM depth_chart_entries dce
       LEFT JOIN athlete_profiles ap ON ap.user_id = dce.user_id
       WHERE dce.team_id = $1
       ORDER BY dce.position, dce.depth_order ASC`,
      [teamId]
    );

    const chart = {};
    for (const pos of POSITIONS) chart[pos] = [];
    for (const entry of entries.rows) {
      if (chart[entry.position]) chart[entry.position].push(entry);
    }
    res.json(chart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch depth chart' });
  }
});

// PUT full replace depth chart
router.put('/team/:teamId', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await pool.query(
      'SELECT * FROM teams WHERE id=$1 AND trainer_id=$2',
      [teamId, req.user.id]
    );
    if (!team.rows[0]) return res.status(403).json({ error: 'You do not own this team' });

    const entries = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'Expected array of entries' });

    if (entries.length > 0) {
      const userIds = [...new Set(entries.map(e => e.user_id))];
      const members = await pool.query(
        'SELECT user_id FROM team_members WHERE team_id=$1 AND user_id = ANY($2)',
        [teamId, userIds]
      );
      const memberSet = new Set(members.rows.map(m => m.user_id));
      for (const uid of userIds) {
        if (!memberSet.has(uid)) return res.status(400).json({ error: `User ${uid} is not a team member` });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM depth_chart_entries WHERE team_id=$1', [teamId]);
      for (const entry of entries) {
        await client.query(
          `INSERT INTO depth_chart_entries (team_id, user_id, position, depth_order)
           VALUES ($1, $2, $3, $4)`,
          [teamId, entry.user_id, entry.position, entry.depth_order || 1]
        );
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update depth chart' });
  }
});

// DELETE single entry
router.delete('/team/:teamId/entry/:entryId', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { teamId, entryId } = req.params;
    const team = await pool.query(
      'SELECT id FROM teams WHERE id=$1 AND trainer_id=$2',
      [teamId, req.user.id]
    );
    if (!team.rows[0]) return res.status(403).json({ error: 'You do not own this team' });
    const result = await pool.query(
      'DELETE FROM depth_chart_entries WHERE id=$1 AND team_id=$2 RETURNING id',
      [entryId, teamId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Entry not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
