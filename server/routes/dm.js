const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET searchable contacts for current user
// Athletes: teammates + coaches of their teams
// Trainers: athletes in their teams
router.get('/contacts', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const search = q ? `%${q}%` : '%';

    let result;
    if (req.user.role === 'trainer') {
      result = await pool.query(
        `SELECT DISTINCT u.id as user_id, u.email, u.role,
                COALESCE(ap.first_name || ' ' || ap.last_name, u.email) AS name,
                ap.photo_url
         FROM team_members tm
         JOIN teams t ON t.id = tm.team_id AND t.trainer_id = $1
         JOIN users u ON u.id = tm.user_id
         LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
         WHERE u.id != $1
           AND (LOWER(ap.first_name) LIKE LOWER($2)
             OR LOWER(ap.last_name) LIKE LOWER($2)
             OR LOWER(u.email) LIKE LOWER($2)
             OR LOWER(ap.first_name || ' ' || ap.last_name) LIKE LOWER($2))
         ORDER BY name
         LIMIT 20`,
        [req.user.id, search]
      );
    } else {
      // Athletes: teammates + coaches of their teams
      result = await pool.query(
        `SELECT DISTINCT u.id as user_id, u.email, u.role,
                COALESCE(ap.first_name || ' ' || ap.last_name, tp.first_name || ' ' || tp.last_name, u.email) AS name,
                COALESCE(ap.photo_url, tp.photo_url) AS photo_url
         FROM team_members my_tm
         JOIN teams t ON t.id = my_tm.team_id AND my_tm.user_id = $1
         JOIN (
           SELECT tm2.user_id, tm2.team_id FROM team_members tm2
           UNION
           SELECT t2.trainer_id, t2.id FROM teams t2
         ) others ON others.team_id = t.id
         JOIN users u ON u.id = others.user_id
         LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
         LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
         WHERE u.id != $1
           AND (LOWER(ap.first_name) LIKE LOWER($2)
             OR LOWER(ap.last_name) LIKE LOWER($2)
             OR LOWER(tp.first_name) LIKE LOWER($2)
             OR LOWER(tp.last_name) LIKE LOWER($2)
             OR LOWER(u.email) LIKE LOWER($2)
             OR LOWER(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')) LIKE LOWER($2)
             OR LOWER(COALESCE(tp.first_name, '') || ' ' || COALESCE(tp.last_name, '')) LIKE LOWER($2))
         ORDER BY name
         LIMIT 20`,
        [req.user.id, search]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search contacts' });
  }
});

// GET all conversations for current user (with last message + unread count)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        partner_id,
        partner_email,
        partner_name,
        partner_photo,
        partner_role,
        last_content,
        last_at,
        unread_count
       FROM (
         SELECT
           CASE WHEN dm.sender_id = $1 THEN dm.recipient_id ELSE dm.sender_id END AS partner_id,
           CASE WHEN dm.sender_id = $1 THEN ru.email ELSE su.email END AS partner_email,
           CASE
             WHEN dm.sender_id = $1 THEN COALESCE(rap.first_name || ' ' || rap.last_name, rtp.first_name || ' ' || rtp.last_name, ru.email)
             ELSE COALESCE(sap.first_name || ' ' || sap.last_name, stp.first_name || ' ' || stp.last_name, su.email)
           END AS partner_name,
           CASE WHEN dm.sender_id = $1 THEN rap.photo_url ELSE sap.photo_url END AS partner_photo,
           CASE WHEN dm.sender_id = $1 THEN ru.role ELSE su.role END AS partner_role,
           dm.content AS last_content,
           dm.created_at AS last_at,
           COUNT(*) FILTER (WHERE dm.recipient_id = $1 AND dm.read = false) OVER (
             PARTITION BY CASE WHEN dm.sender_id = $1 THEN dm.recipient_id ELSE dm.sender_id END
           ) AS unread_count,
           ROW_NUMBER() OVER (
             PARTITION BY CASE WHEN dm.sender_id = $1 THEN dm.recipient_id ELSE dm.sender_id END
             ORDER BY dm.created_at DESC
           ) AS rn
         FROM direct_messages dm
         JOIN users su ON su.id = dm.sender_id
         JOIN users ru ON ru.id = dm.recipient_id
         LEFT JOIN athlete_profiles sap ON sap.user_id = dm.sender_id
         LEFT JOIN trainer_profiles stp ON stp.user_id = dm.sender_id
         LEFT JOIN athlete_profiles rap ON rap.user_id = dm.recipient_id
         LEFT JOIN trainer_profiles rtp ON rtp.user_id = dm.recipient_id
         WHERE dm.sender_id = $1 OR dm.recipient_id = $1
       ) t
       WHERE rn = 1
       ORDER BY last_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET messages with a specific user
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT dm.*,
              COALESCE(sap.first_name || ' ' || sap.last_name, stp.first_name || ' ' || stp.last_name, su.email) AS sender_name,
              COALESCE(sap.photo_url, stp.photo_url) AS sender_photo,
              COALESCE(
                (SELECT json_agg(json_build_object('emoji', r.emoji, 'count', r.cnt, 'user_ids', r.user_ids))
                 FROM (
                   SELECT emoji, COUNT(*)::int as cnt, array_agg(user_id::text) as user_ids
                   FROM dm_reactions
                   WHERE message_id = dm.id
                   GROUP BY emoji
                 ) r
                ), '[]'::json
              ) as reactions
       FROM direct_messages dm
       JOIN users su ON su.id = dm.sender_id
       LEFT JOIN athlete_profiles sap ON sap.user_id = dm.sender_id
       LEFT JOIN trainer_profiles stp ON stp.user_id = dm.sender_id
       WHERE (dm.sender_id = $1 AND dm.recipient_id = $2)
          OR (dm.sender_id = $2 AND dm.recipient_id = $1)
       ORDER BY dm.created_at ASC`,
      [req.user.id, userId]
    );
    // Mark incoming as read
    await pool.query(
      'UPDATE direct_messages SET read = true WHERE sender_id = $1 AND recipient_id = $2 AND read = false',
      [userId, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST send a DM
router.post('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { content, media_url, media_type } = req.body;
    if ((!content || !content.trim()) && !media_url) return res.status(400).json({ error: 'content or media_url is required' });

    const recipient = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!recipient.rows[0]) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(
      'INSERT INTO direct_messages (sender_id, recipient_id, content, media_url, media_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, userId, content?.trim() || '', media_url || null, media_type || null]
    );
    const msg = result.rows[0];

    const senderInfo = await pool.query(
      `SELECT COALESCE(ap.first_name || ' ' || ap.last_name, tp.first_name || ' ' || tp.last_name, u.email) AS sender_name,
              COALESCE(ap.photo_url, tp.photo_url) AS sender_photo
       FROM users u
       LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
       LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.status(201).json({ ...msg, ...senderInfo.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /:partnerId/react/:messageId — toggle a DM reaction
router.post('/:partnerId/react/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'emoji is required' });

    const ALLOWED = ['❤️', '👍', '😂', '🔥', '😮'];
    if (!ALLOWED.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' });

    // Verify message belongs to this conversation
    const msg = await pool.query(
      'SELECT id FROM direct_messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)',
      [messageId, req.user.id]
    );
    if (!msg.rows[0]) return res.status(404).json({ error: 'Message not found' });

    const existing = await pool.query(
      'SELECT id FROM dm_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, req.user.id, emoji]
    );
    if (existing.rows[0]) {
      await pool.query('DELETE FROM dm_reactions WHERE id = $1', [existing.rows[0].id]);
    } else {
      await pool.query(
        'INSERT INTO dm_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
        [messageId, req.user.id, emoji]
      );
    }

    const updated = await pool.query(
      `SELECT emoji, COUNT(*)::int as count, array_agg(user_id::text) as user_ids
       FROM dm_reactions WHERE message_id = $1
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
