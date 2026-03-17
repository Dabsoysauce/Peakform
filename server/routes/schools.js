const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const url = `https://educationdata.urban.org/api/v1/schools/ccd/directory/?school_name=${encodeURIComponent(q.trim())}&school_level=3&per_page=10&fields=school_name,city_location,state_location`;

    const response = await fetch(url);
    const data = await response.json();

    const results = (data.results || []).map((s) => ({
      name: s.school_name,
      city: s.city_location,
      state: s.state_location,
      label: `${s.school_name} — ${s.city_location}, ${s.state_location}`,
    }));

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'School search failed' });
  }
});

module.exports = router;
