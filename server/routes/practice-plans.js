const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET list trainer's plans
router.get('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pp.*, COUNT(ppb.id)::int as block_count
       FROM practice_plans pp
       LEFT JOIN practice_plan_blocks ppb ON ppb.plan_id = pp.id
       WHERE pp.trainer_id = $1
       GROUP BY pp.id
       ORDER BY pp.plan_date DESC NULLS LAST, pp.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch practice plans' });
  }
});

// POST create plan
router.post('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { title, plan_date, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const result = await pool.query(
      `INSERT INTO practice_plans (trainer_id, title, plan_date, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, title, plan_date || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create practice plan' });
  }
});

// GET single plan + blocks
router.get('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const plan = await pool.query(
      'SELECT * FROM practice_plans WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!plan.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const blocks = await pool.query(
      'SELECT * FROM practice_plan_blocks WHERE plan_id=$1 ORDER BY sort_order ASC',
      [req.params.id]
    );
    res.json({ ...plan.rows[0], blocks: blocks.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch practice plan' });
  }
});

// PUT update plan header
router.put('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { title, plan_date, notes } = req.body;
    const result = await pool.query(
      `UPDATE practice_plans SET title=$1, plan_date=$2, notes=$3
       WHERE id=$4 AND trainer_id=$5 RETURNING *`,
      [title, plan_date || null, notes || null, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update practice plan' });
  }
});

// DELETE plan
router.delete('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM practice_plans WHERE id=$1 AND trainer_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete practice plan' });
  }
});

// POST add block
router.post('/:id/blocks', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const plan = await pool.query(
      'SELECT id FROM practice_plans WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!plan.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const { title, duration_minutes, focus_area, notes, sort_order } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const result = await pool.query(
      `INSERT INTO practice_plan_blocks (plan_id, title, duration_minutes, focus_area, notes, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, title, duration_minutes || null, focus_area || null, notes || null, sort_order ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add block' });
  }
});

// PUT edit block
router.put('/:id/blocks/:blockId', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const plan = await pool.query(
      'SELECT id FROM practice_plans WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!plan.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const { title, duration_minutes, focus_area, notes, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE practice_plan_blocks SET title=$1, duration_minutes=$2, focus_area=$3, notes=$4, sort_order=$5
       WHERE id=$6 AND plan_id=$7 RETURNING *`,
      [title, duration_minutes || null, focus_area || null, notes || null, sort_order ?? 0, req.params.blockId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Block not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update block' });
  }
});

// DELETE remove block
router.delete('/:id/blocks/:blockId', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const plan = await pool.query(
      'SELECT id FROM practice_plans WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!plan.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const result = await pool.query(
      'DELETE FROM practice_plan_blocks WHERE id=$1 AND plan_id=$2 RETURNING id',
      [req.params.blockId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Block not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

// PUT reorder blocks
router.put('/:id/reorder', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const plan = await pool.query(
      'SELECT id FROM practice_plans WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!plan.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const blocks = req.body;
    if (!Array.isArray(blocks)) return res.status(400).json({ error: 'Expected array of {id, sort_order}' });
    const ids = blocks.map(b => b.id);
    await pool.query(
      `UPDATE practice_plan_blocks SET sort_order = v.sort_order
       FROM (SELECT UNNEST($1::uuid[]) as id, UNNEST($2::int[]) as sort_order) v
       WHERE practice_plan_blocks.id = v.id AND practice_plan_blocks.plan_id = $3`,
      [ids, blocks.map(b => b.sort_order), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reorder blocks' });
  }
});

// POST share plan to team as DM
router.post('/:id/share', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { team_id } = req.body;
    const plan = await pool.query(
      'SELECT * FROM practice_plans WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!plan.rows[0]) return res.status(404).json({ error: 'Plan not found' });

    if (team_id) {
      const team = await pool.query(
        'SELECT id FROM teams WHERE id=$1 AND trainer_id=$2',
        [team_id, req.user.id]
      );
      if (!team.rows[0]) return res.status(403).json({ error: 'You do not own this team' });
    }

    const p = plan.rows[0];
    const dateStr = p.plan_date
      ? new Date(p.plan_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'Date TBD';

    const blocks = await pool.query(
      'SELECT * FROM practice_plan_blocks WHERE plan_id=$1 ORDER BY sort_order ASC',
      [req.params.id]
    );

    let content = `📋 PRACTICE PLAN: ${p.title}\n📆 ${dateStr}`;
    if (p.notes) content += `\n\n${p.notes}`;
    content += '\n\n' + '─'.repeat(32);
    for (const block of blocks.rows) {
      content += `\n[${block.duration_minutes ? block.duration_minutes + 'min' : '?min'}] ${block.title}`;
      if (block.focus_area) content += ` (${block.focus_area})`;
      if (block.notes) content += `\n  ${block.notes}`;
    }

    const membersQuery = team_id
      ? `SELECT DISTINCT tm.user_id FROM team_members tm WHERE tm.team_id = $1`
      : `SELECT DISTINCT tm.user_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.trainer_id = $1`;
    const members = await pool.query(membersQuery, [team_id || req.user.id]);

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
    res.status(500).json({ error: 'Failed to share practice plan' });
  }
});

module.exports = router;
