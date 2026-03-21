const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET all goals for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// POST create goal
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, metric, target_value, comparison, deadline } = req.body;
    if (!title || !metric || target_value == null || !comparison) {
      return res.status(400).json({ error: 'title, metric, target_value, and comparison are required' });
    }
    const result = await pool.query(
      `INSERT INTO goals (user_id, title, metric, target_value, comparison, deadline)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, title, metric, target_value, comparison, deadline || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// PUT update goal
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, metric, target_value, comparison, achieved, deadline } = req.body;
    const result = await pool.query(
      `UPDATE goals SET
        title = COALESCE($1, title),
        metric = COALESCE($2, metric),
        target_value = COALESCE($3, target_value),
        comparison = COALESCE($4, comparison),
        achieved = COALESCE($5, achieved),
        deadline = $6
      WHERE id = $7 AND user_id = $8 RETURNING *`,
      [title, metric, target_value, comparison, achieved, deadline || null, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// DELETE goal
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// POST assign a goal to a player (trainer only)
router.post('/assign/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'trainer') return res.status(403).json({ error: 'Trainers only' });

    // Verify player is on one of this trainer's teams
    const membership = await pool.query(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.trainer_id = $2 LIMIT 1`,
      [req.params.userId, req.user.id]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: 'Player is not on any of your teams' });

    const { title, metric, target_value, comparison, deadline } = req.body;
    if (!title || !metric || target_value == null || !comparison) {
      return res.status(400).json({ error: 'title, metric, target_value, and comparison are required' });
    }

    const result = await pool.query(
      `INSERT INTO goals (user_id, title, metric, target_value, comparison, deadline, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.userId, title, metric, target_value, comparison, deadline || null, req.user.id]
    );

    // Notify the player
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES ($1, 'goal_assigned', $2, $3)`,
      [req.params.userId, `Your coach assigned you a new goal: "${title}"`, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign goal' });
  }
});

// POST check goals against current stats
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const goals = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 AND achieved = FALSE',
      [req.user.id]
    );

    // Gather current stats
    const maxBench = await pool.query(
      `SELECT MAX(e.weight_lbs) as val FROM exercises e
       JOIN workout_sessions ws ON e.session_id = ws.id
       WHERE ws.user_id = $1 AND LOWER(e.exercise_name) LIKE '%bench%'`,
      [req.user.id]
    );
    const maxSquat = await pool.query(
      `SELECT MAX(e.weight_lbs) as val FROM exercises e
       JOIN workout_sessions ws ON e.session_id = ws.id
       WHERE ws.user_id = $1 AND LOWER(e.exercise_name) LIKE '%squat%'`,
      [req.user.id]
    );
    const maxDeadlift = await pool.query(
      `SELECT MAX(e.weight_lbs) as val FROM exercises e
       JOIN workout_sessions ws ON e.session_id = ws.id
       WHERE ws.user_id = $1 AND LOWER(e.exercise_name) LIKE '%deadlift%'`,
      [req.user.id]
    );
    const weeklySessions = await pool.query(
      `SELECT COUNT(*) as val FROM workout_sessions
       WHERE user_id = $1 AND session_date >= NOW() - INTERVAL '7 days'`,
      [req.user.id]
    );
    const athleteProfile = await pool.query(
      'SELECT weight_lbs FROM athlete_profiles WHERE user_id = $1',
      [req.user.id]
    );

    const statsMap = {
      bench_press_max: parseFloat(maxBench.rows[0]?.val) || 0,
      squat_max: parseFloat(maxSquat.rows[0]?.val) || 0,
      deadlift_max: parseFloat(maxDeadlift.rows[0]?.val) || 0,
      total_weekly_sessions: parseInt(weeklySessions.rows[0]?.val) || 0,
      bodyweight: parseFloat(athleteProfile.rows[0]?.weight_lbs) || 0,
    };

    const newlyAchieved = [];
    for (const goal of goals.rows) {
      const current = statsMap[goal.metric];
      if (current === undefined) continue;
      const target = parseFloat(goal.target_value);
      let met = false;
      if (goal.comparison === 'gte' && current >= target) met = true;
      if (goal.comparison === 'lte' && current <= target) met = true;
      if (goal.comparison === 'eq' && current === target) met = true;

      if (met) {
        await pool.query(
          'UPDATE goals SET achieved = TRUE WHERE id = $1',
          [goal.id]
        );
        newlyAchieved.push({ ...goal, achieved: true });
      }
    }

    res.json({ newly_achieved: newlyAchieved, stats: statsMap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check goals' });
  }
});

module.exports = router;
