const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

function generateJoinKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 8; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// GET teams for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'trainer') {
      result = await pool.query(
        `SELECT t.*, COUNT(tm.id)::int as member_count
         FROM teams t
         LEFT JOIN team_members tm ON tm.team_id = t.id
         WHERE t.trainer_id = $1
         GROUP BY t.id
         ORDER BY t.created_at DESC`,
        [req.user.id]
      );
    } else {
      result = await pool.query(
        `SELECT t.*, COUNT(tm2.id)::int as member_count,
                tp.first_name as trainer_first_name, tp.last_name as trainer_last_name
         FROM teams t
         JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
         LEFT JOIN team_members tm2 ON tm2.team_id = t.id
         LEFT JOIN trainer_profiles tp ON tp.user_id = t.trainer_id
         GROUP BY t.id, tp.first_name, tp.last_name
         ORDER BY t.created_at DESC`,
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// POST create team (trainer only)
router.post('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { name, coach_only } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    let join_key;
    let attempts = 0;
    while (attempts < 10) {
      join_key = generateJoinKey();
      const existing = await pool.query('SELECT id FROM teams WHERE join_key = $1', [join_key]);
      if (!existing.rows[0]) break;
      attempts++;
    }

    const result = await pool.query(
      `INSERT INTO teams (trainer_id, name, join_key, coach_only)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name, join_key, coach_only || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// POST athlete joins team by join_key
router.post('/join', authMiddleware, requireRole('athlete'), async (req, res) => {
  try {
    const { join_key } = req.body;
    if (!join_key) return res.status(400).json({ error: 'join_key is required' });

    const team = await pool.query('SELECT * FROM teams WHERE join_key = $1', [join_key.toUpperCase()]);
    if (!team.rows[0]) return res.status(404).json({ error: 'Team not found with that join key' });

    const existing = await pool.query(
      'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
      [team.rows[0].id, req.user.id]
    );
    if (existing.rows[0]) return res.status(400).json({ error: 'Already a member of this team' });

    await pool.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
      [team.rows[0].id, req.user.id]
    );
    res.json(team.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

// GET team members
router.get('/:id/members', authMiddleware, async (req, res) => {
  try {
    const team = await pool.query('SELECT * FROM teams WHERE id = $1', [req.params.id]);
    if (!team.rows[0]) return res.status(404).json({ error: 'Team not found' });

    // Check access: trainer who owns it, or member
    const isMember = await pool.query(
      'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const isTrainer = team.rows[0].trainer_id === req.user.id;
    if (!isTrainer && !isMember.rows[0]) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = await pool.query(
      `SELECT u.id, u.email, u.role,
              ap.first_name, ap.last_name, ap.primary_goal,
              g.name as gym_name,
              tm.joined_at
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
       LEFT JOIN gyms g ON g.id = ap.gym_id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [req.params.id]
    );
    res.json(members.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// DELETE leave team (athlete)
router.delete('/:id/leave', authMiddleware, requireRole('athlete'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not a member of this team' });
    await pool.query(
      'DELETE FROM depth_chart_entries WHERE team_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Left team successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to leave team' });
  }
});

// GET check if a user is one of this trainer's players
router.get('/is-my-player/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'trainer') return res.json({ isPlayer: false });
    const result = await pool.query(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.trainer_id = $2 LIMIT 1`,
      [req.params.userId, req.user.id]
    );
    res.json({ isPlayer: !!result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ isPlayer: false });
  }
});

// Get full player profile (coach only — must be on coach's team)
router.get('/players/:userId/profile', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify this player is on one of the coach's teams
    const membership = await pool.query(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.trainer_id = $2 LIMIT 1`,
      [userId, req.user.id]
    );
    if (!membership.rows[0]) {
      return res.status(403).json({ error: 'This player is not on any of your teams' });
    }

    // Fetch player's athlete profile
    const profileRes = await pool.query(
      `SELECT ap.*, u.email FROM athlete_profiles ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.user_id = $1`,
      [userId]
    );

    // Fetch player's workouts (last 20)
    const workoutsRes = await pool.query(
      `SELECT ws.*,
              json_agg(json_build_object(
                'id', e.id, 'exercise_name', e.exercise_name,
                'sets', e.sets, 'reps', e.reps,
                'weight_lbs', e.weight_lbs, 'notes', e.notes
              )) FILTER (WHERE e.id IS NOT NULL) as exercises
       FROM workout_sessions ws
       LEFT JOIN exercises e ON e.session_id = ws.id
       WHERE ws.user_id = $1
       GROUP BY ws.id
       ORDER BY ws.created_at DESC
       LIMIT 20`,
      [userId]
    );

    // Fetch player's media (last 10)
    const mediaRes = await pool.query(
      `SELECT id, title, description, url, thumbnail_url, media_type, tags, created_at
       FROM media WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    // Fetch player's film analyses
    const analysesRes = await pool.query(
      `SELECT ma.id, ma.analysis, ma.focus, ma.created_at, m.title as media_title
       FROM media_analyses ma
       JOIN media m ON ma.media_id = m.id
       WHERE ma.user_id = $1
       ORDER BY ma.created_at DESC LIMIT 10`,
      [userId]
    );

    res.json({
      profile: profileRes.rows[0] || null,
      workouts: workoutsRes.rows,
      media: mediaRes.rows,
      analyses: analysesRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load player profile' });
  }
});

module.exports = router;
