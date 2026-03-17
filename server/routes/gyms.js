const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET search gyms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM gyms';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` WHERE LOWER(name) LIKE LOWER($1) OR LOWER(city) LIKE LOWER($1)`;
    }
    query += ' ORDER BY name LIMIT 20';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search gyms' });
  }
});

// POST create gym
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, city, state } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await pool.query(
      `INSERT INTO gyms (name, city, state) VALUES ($1, $2, $3)
       ON CONFLICT (name, city, state) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [name, city || null, state || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create gym' });
  }
});

module.exports = router;
