const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET all sessions for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sessions = await pool.query(
      `SELECT ws.*, COUNT(e.id)::int as exercise_count
       FROM workout_sessions ws
       LEFT JOIN exercises e ON e.session_id = ws.id
       WHERE ws.user_id = $1
       GROUP BY ws.id
       ORDER BY ws.session_date DESC, ws.created_at DESC`,
      [req.user.id]
    );
    res.json(sessions.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// POST create new session
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { session_date, session_name, notes, duration_minutes } = req.body;
    if (!session_date) return res.status(400).json({ error: 'session_date is required' });

    const result = await pool.query(
      `INSERT INTO workout_sessions (user_id, session_date, session_name, notes, duration_minutes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, session_date, session_name || null, notes || null, duration_minutes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// GET session with exercises
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const session = await pool.query(
      'SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!session.rows[0]) return res.status(404).json({ error: 'Session not found' });

    const exercises = await pool.query(
      'SELECT * FROM exercises WHERE session_id = $1 ORDER BY id',
      [req.params.id]
    );
    res.json({ ...session.rows[0], exercises: exercises.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// DELETE session
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM workout_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST assign a workout to a player (trainer only)
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

    const { session_name, session_date, notes, duration_minutes, exercises } = req.body;
    if (!session_name || !session_date) {
      return res.status(400).json({ error: 'session_name and session_date are required' });
    }

    const session = await pool.query(
      `INSERT INTO workout_sessions (user_id, session_date, session_name, notes, duration_minutes, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.userId, session_date, session_name, notes || null, duration_minutes || null, req.user.id]
    );

    // Insert prescribed exercises if provided
    if (Array.isArray(exercises) && exercises.length > 0) {
      for (const ex of exercises) {
        if (!ex.exercise_name) continue;
        await pool.query(
          `INSERT INTO exercises (session_id, exercise_name, sets, reps, weight_lbs, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [session.rows[0].id, ex.exercise_name, ex.sets || null, ex.reps || null, ex.weight_lbs || null, ex.notes || null]
        );
      }
    }

    // Notify the player
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES ($1, 'workout_assigned', $2, $3)`,
      [req.params.userId, `Your coach assigned you a workout: "${session_name}"`, session.rows[0].id]
    );

    res.status(201).json(session.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign workout' });
  }
});

// POST add exercise to session
router.post('/:id/exercises', authMiddleware, async (req, res) => {
  try {
    const session = await pool.query(
      'SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!session.rows[0]) return res.status(404).json({ error: 'Session not found' });

    const { exercise_name, sets, reps, weight_lbs, rpe, notes } = req.body;
    if (!exercise_name) return res.status(400).json({ error: 'exercise_name is required' });

    const result = await pool.query(
      `INSERT INTO exercises (session_id, exercise_name, sets, reps, weight_lbs, rpe, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, exercise_name, sets || null, reps || null, weight_lbs || null, rpe || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// DELETE exercise
router.delete('/:sessionId/exercises/:exerciseId', authMiddleware, async (req, res) => {
  try {
    const session = await pool.query(
      'SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [req.params.sessionId, req.user.id]
    );
    if (!session.rows[0]) return res.status(404).json({ error: 'Session not found' });

    const result = await pool.query(
      'DELETE FROM exercises WHERE id = $1 AND session_id = $2 RETURNING id',
      [req.params.exerciseId, req.params.sessionId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

module.exports = router;
