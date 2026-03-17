require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/db');

async function seedSchools() {
  console.log('Fetching US high schools from Urban Institute API...');

  let page = 1;
  let total = 0;
  let inserted = 0;
  const PER_PAGE = 100;

  // Clear existing data
  await pool.query('TRUNCATE TABLE schools RESTART IDENTITY');
  console.log('Cleared existing schools table.');

  while (true) {
    const url = `https://educationdata.urban.org/api/v1/schools/ccd/directory/2021/?school_level=3&per_page=${PER_PAGE}&page=${page}&fields=school_name,city_location,state_location`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (page === 1) {
        total = data.count;
        console.log(`Total high schools to import: ${total}`);
      }

      const results = data.results || [];
      if (results.length === 0) break;

      // Batch insert
      const values = results
        .filter(s => s.school_name)
        .map((s, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);

      const params = results
        .filter(s => s.school_name)
        .flatMap(s => [s.school_name, s.city_location || null, s.state_location || null]);

      if (values.length > 0) {
        await pool.query(
          `INSERT INTO schools (name, city, state) VALUES ${values.join(',')} ON CONFLICT DO NOTHING`,
          params
        );
        inserted += values.length;
      }

      console.log(`Page ${page}: inserted ${inserted}/${total}`);

      if (!data.next) break;
      page++;

      // Small delay to be polite to the API
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
      break;
    }
  }

  console.log(`Done! Inserted ${inserted} schools.`);
  process.exit(0);
}

seedSchools();
