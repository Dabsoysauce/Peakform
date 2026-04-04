const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET list trainer's templates
router.get('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ppt.*, COUNT(pptb.id)::int as block_count
       FROM practice_plan_templates ppt
       LEFT JOIN practice_plan_template_blocks pptb ON pptb.template_id = ppt.id
       WHERE ppt.trainer_id = $1
       GROUP BY ppt.id
       ORDER BY ppt.template_type ASC, ppt.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST create template
router.post('/', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { title, template_type, focus_area, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!template_type || !['block', 'practice'].includes(template_type)) {
      return res.status(400).json({ error: 'template_type must be "block" or "practice"' });
    }
    const result = await pool.query(
      `INSERT INTO practice_plan_templates (trainer_id, title, template_type, focus_area, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, template_type, focus_area || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// GET single template + blocks
router.get('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const template = await pool.query(
      'SELECT * FROM practice_plan_templates WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!template.rows[0]) return res.status(404).json({ error: 'Template not found' });
    const blocks = await pool.query(
      'SELECT * FROM practice_plan_template_blocks WHERE template_id=$1 ORDER BY sort_order ASC',
      [req.params.id]
    );
    res.json({ ...template.rows[0], blocks: blocks.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// PUT update template
router.put('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { title, template_type, focus_area, notes } = req.body;
    const result = await pool.query(
      `UPDATE practice_plan_templates SET title=$1, template_type=$2, focus_area=$3, notes=$4
       WHERE id=$5 AND trainer_id=$6 RETURNING *`,
      [title, template_type, focus_area || null, notes || null, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE template
router.delete('/:id', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM practice_plan_templates WHERE id=$1 AND trainer_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// POST add block to template
router.post('/:id/blocks', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const template = await pool.query(
      'SELECT id FROM practice_plan_templates WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!template.rows[0]) return res.status(404).json({ error: 'Template not found' });
    const { title, duration_minutes, focus_area, notes, sort_order } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const result = await pool.query(
      `INSERT INTO practice_plan_template_blocks (template_id, title, duration_minutes, focus_area, notes, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, title, duration_minutes || null, focus_area || null, notes || null, sort_order ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add block' });
  }
});

// PUT edit template block
router.put('/:id/blocks/:blockId', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const template = await pool.query(
      'SELECT id FROM practice_plan_templates WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!template.rows[0]) return res.status(404).json({ error: 'Template not found' });
    const { title, duration_minutes, focus_area, notes, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE practice_plan_template_blocks SET title=$1, duration_minutes=$2, focus_area=$3, notes=$4, sort_order=$5
       WHERE id=$6 AND template_id=$7 RETURNING *`,
      [title, duration_minutes || null, focus_area || null, notes || null, sort_order ?? 0, req.params.blockId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Block not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update block' });
  }
});

// DELETE remove template block
router.delete('/:id/blocks/:blockId', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const template = await pool.query(
      'SELECT id FROM practice_plan_templates WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!template.rows[0]) return res.status(404).json({ error: 'Template not found' });
    const result = await pool.query(
      'DELETE FROM practice_plan_template_blocks WHERE id=$1 AND template_id=$2 RETURNING id',
      [req.params.blockId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Block not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

// PUT reorder template blocks
router.put('/:id/reorder', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const template = await pool.query(
      'SELECT id FROM practice_plan_templates WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!template.rows[0]) return res.status(404).json({ error: 'Template not found' });
    const blocks = req.body;
    if (!Array.isArray(blocks)) return res.status(400).json({ error: 'Expected array of {id, sort_order}' });
    const ids = blocks.map(b => b.id);
    await pool.query(
      `UPDATE practice_plan_template_blocks SET sort_order = v.sort_order
       FROM (SELECT UNNEST($1::uuid[]) as id, UNNEST($2::int[]) as sort_order) v
       WHERE practice_plan_template_blocks.id = v.id AND practice_plan_template_blocks.template_id = $3`,
      [ids, blocks.map(b => b.sort_order), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reorder blocks' });
  }
});

// POST insert template blocks into a practice plan
router.post('/:id/insert', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { plan_id, start_order } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

    const plan = await pool.query(
      'SELECT id FROM practice_plans WHERE id=$1 AND trainer_id=$2',
      [plan_id, req.user.id]
    );
    if (!plan.rows[0]) return res.status(404).json({ error: 'Plan not found' });

    const template = await pool.query(
      'SELECT * FROM practice_plan_templates WHERE id=$1 AND trainer_id=$2',
      [req.params.id, req.user.id]
    );
    if (!template.rows[0]) return res.status(404).json({ error: 'Template not found' });

    const tpl = template.rows[0];
    let blocks;
    if (tpl.template_type === 'practice') {
      blocks = await pool.query(
        'SELECT * FROM practice_plan_template_blocks WHERE template_id=$1 ORDER BY sort_order ASC',
        [req.params.id]
      );
    } else {
      blocks = await pool.query(
        `SELECT * FROM practice_plan_template_blocks WHERE template_id=$1 ORDER BY sort_order ASC`,
        [req.params.id]
      );
    }

    const order = start_order != null ? start_order : 0;
    const inserted = [];
    for (let i = 0; i < blocks.rows.length; i++) {
      const b = blocks.rows[i];
      const result = await pool.query(
        `INSERT INTO practice_plan_blocks (plan_id, title, duration_minutes, focus_area, notes, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [plan_id, b.title, b.duration_minutes, b.focus_area, b.notes, order + i]
      );
      inserted.push(result.rows[0]);
    }

    res.json({ success: true, blocks: inserted, template: tpl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert template' });
  }
});

module.exports = router;
