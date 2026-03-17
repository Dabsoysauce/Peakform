const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const result = await pool.query(
      `SELECT name, city, state FROM schools
       WHERE lower(name) LIKE lower($1)
       ORDER BY name ASC
       LIMIT 10`,
      [`${q.trim()}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'School search failed' });
  }
});

module.exports = router;
