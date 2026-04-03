/**
 * Peakform Demo Seed Script
 *
 * Populates the database with realistic fake data for demos.
 * Creates trainers, athletes, teams, workouts, goals, messages, media, and more.
 *
 * Usage:
 *   node server/scripts/seed-demo.js
 *
 * WARNING: This will DELETE all existing data. Do not run on production.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// ─── Demo credentials (easy to remember for demos) ───────────────────────────
const TRAINER_PASSWORD = 'Demo1234!';
const ATHLETE_PASSWORD = 'Demo1234!';

// ─── Fake data ────────────────────────────────────────────────────────────────

const trainers = [
  {
    email: 'coach.marcus@peakform.demo',
    first_name: 'Marcus', last_name: 'Williams',
    specialty: 'Strength & Conditioning',
    certifications: 'CSCS, NASM-CPT',
    bio: 'Former D1 athlete with 10+ years coaching high school basketball players. Focused on explosive power and injury prevention.',
    school_name: 'Westside Academy',
  },
  {
    email: 'coach.diana@peakform.demo',
    first_name: 'Diana', last_name: 'Torres',
    specialty: 'Speed & Agility',
    certifications: 'USAW, NSCA-CSCS',
    bio: 'Olympic sprinting background. Specializes in developing elite athleticism for basketball and football players.',
    school_name: 'Elite Performance Center',
  },
];

const athletes = [
  { email: 'jaylen.b@peakform.demo', first_name: 'Jaylen', last_name: 'Brooks', age: 17, weight_lbs: 185, height_inches: 76, primary_goal: 'Increase vertical jump', school_name: 'Westside Academy', gpa: 3.4, graduation_year: 2027, bio: 'Point guard. Working on explosiveness and first step quickness.' },
  { email: 'marcus.j@peakform.demo', first_name: 'Marcus', last_name: 'Johnson', age: 16, weight_lbs: 210, height_inches: 78, primary_goal: 'Build upper body strength', school_name: 'Westside Academy', gpa: 3.1, graduation_year: 2028, bio: 'Power forward. Trying to dominate in the post.' },
  { email: 'tyler.w@peakform.demo', first_name: 'Tyler', last_name: 'Washington', age: 18, weight_lbs: 175, height_inches: 74, primary_goal: 'Increase bench press PR', school_name: 'Lincoln High School', gpa: 3.7, graduation_year: 2026, bio: 'Shooting guard. Focused on strength and shot mechanics.' },
  { email: 'darius.m@peakform.demo', first_name: 'Darius', last_name: 'Mitchell', age: 17, weight_lbs: 195, height_inches: 77, primary_goal: 'Improve conditioning', school_name: 'Westside Academy', gpa: 2.9, graduation_year: 2027, bio: 'Small forward. Needs to improve endurance for fourth quarter.' },
  { email: 'zion.h@peakform.demo', first_name: 'Zion', last_name: 'Harris', age: 16, weight_lbs: 220, height_inches: 80, primary_goal: 'Increase squat PR', school_name: 'Roosevelt High', gpa: 3.2, graduation_year: 2028, bio: 'Center. Building a monster base for low post play.' },
  { email: 'cam.r@peakform.demo', first_name: 'Cameron', last_name: 'Robinson', age: 17, weight_lbs: 165, height_inches: 72, primary_goal: 'Lose body fat', school_name: 'Lincoln High School', gpa: 3.5, graduation_year: 2027, bio: 'Point guard. Working on speed and cutting body fat.' },
  { email: 'noah.p@peakform.demo', first_name: 'Noah', last_name: 'Parker', age: 18, weight_lbs: 200, height_inches: 75, primary_goal: 'Increase deadlift PR', school_name: 'Westside Academy', gpa: 3.8, graduation_year: 2026, bio: 'Wing player. Senior going for a D1 offer.' },
  { email: 'isaiah.t@peakform.demo', first_name: 'Isaiah', last_name: 'Thompson', age: 15, weight_lbs: 155, height_inches: 70, primary_goal: 'Build overall strength', school_name: 'Roosevelt High', gpa: 3.0, graduation_year: 2029, bio: 'Freshman. Brand new to lifting, huge potential.' },
];

const teamData = [
  { name: 'Westside Varsity 2026', coach_only: false },
  { name: 'Elite Skill Development', coach_only: false },
];

const exercises = [
  { name: 'Squat', sets: 4, reps: 5, weight_lbs: 225, rpe: 8.5 },
  { name: 'Bench Press', sets: 4, reps: 6, weight_lbs: 185, rpe: 8.0 },
  { name: 'Deadlift', sets: 3, reps: 3, weight_lbs: 315, rpe: 9.0 },
  { name: 'Romanian Deadlift', sets: 3, reps: 8, weight_lbs: 185, rpe: 7.5 },
  { name: 'Pull-Ups', sets: 4, reps: 8, weight_lbs: 0, rpe: 7.0 },
  { name: 'Box Jump', sets: 5, reps: 3, weight_lbs: 0, rpe: 8.0 },
  { name: 'Power Clean', sets: 4, reps: 3, weight_lbs: 155, rpe: 8.5 },
  { name: 'Dumbbell Row', sets: 3, reps: 10, weight_lbs: 80, rpe: 7.0 },
  { name: 'Bulgarian Split Squat', sets: 3, reps: 8, weight_lbs: 60, rpe: 8.0 },
  { name: 'Hip Thrust', sets: 4, reps: 10, weight_lbs: 225, rpe: 7.5 },
  { name: 'Overhead Press', sets: 3, reps: 8, weight_lbs: 115, rpe: 8.0 },
  { name: 'Lateral Band Walk', sets: 3, reps: 15, weight_lbs: 0, rpe: 6.0 },
];

const workoutNames = [
  'Lower Body Power', 'Upper Body Strength', 'Full Body Olympic',
  'Speed & Explosiveness', 'Posterior Chain', 'Push Day', 'Pull Day',
  'Leg Day', 'Athletic Development', 'Pre-Season Prep',
];

const teamMessages = [
  { content: 'Great work in the gym today everyone 🔥 Keep that energy up heading into game week.' },
  { content: 'Reminder: Film session is moved to Thursday at 4pm. Be there.' },
  { content: 'Tyler PR\'d his bench at 225 today. That\'s what we\'re talking about 💪' },
  { content: 'Make sure everyone is logging their workouts. I check these every week.' },
  { content: 'Next week we\'re focusing on vertical jump. Come ready to work.' },
  { content: 'Good practice today. Defense looked way better than last week.' },
  { content: 'Anyone need extra reps this week, I\'ll be in the gym Saturday morning at 9.' },
  { content: 'Jaylen hit 32" on the vert test. New team record 🎯' },
  { content: 'Sleep and nutrition matter just as much as the gym. Make sure you\'re eating right.' },
  { content: 'State tournament bracket drops Friday. Let\'s be ready.' },
];

const mediaItems = [
  { title: 'Squat Form Check - 225lbs', description: 'Coach requested form review. Week 6 of program.', url: 'https://www.youtube.com/watch?v=ultWZbUMPL8', media_type: 'video' },
  { title: 'Vertical Jump Test - Pre Season', description: 'Baseline measurement before starting the jump program.', url: 'https://www.youtube.com/watch?v=ultWZbUMPL8', media_type: 'video' },
  { title: 'Power Clean PR Attempt', description: '175lbs power clean. Coach said form was clean.', url: 'https://www.youtube.com/watch?v=ultWZbUMPL8', media_type: 'video' },
  { title: 'Game Highlights vs Roosevelt', description: 'Cut of my best plays from Friday\'s game.', url: 'https://www.youtube.com/watch?v=ultWZbUMPL8', media_type: 'video' },
];

const goalTemplates = [
  { title: 'Bench Press 225lbs', metric: 'bench_pr', target_value: 225, comparison: 'gte' },
  { title: 'Squat 315lbs', metric: 'squat_pr', target_value: 315, comparison: 'gte' },
  { title: 'Deadlift 405lbs', metric: 'deadlift_pr', target_value: 405, comparison: 'gte' },
  { title: 'Reach 185lbs bodyweight', metric: 'bodyweight', target_value: 185, comparison: 'gte' },
  { title: 'Cut to 175lbs', metric: 'bodyweight', target_value: 175, comparison: 'lte' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function generateJoinKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting demo seed...\n');

  // ── Wipe existing demo data ──
  console.log('🗑  Clearing existing demo data...');
  await pool.query(`DELETE FROM users WHERE email LIKE '%.demo'`);
  console.log('   Done.\n');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD(), 10);

  // ── Gym ──
  console.log('🏋️  Creating gym...');
  const gymRes = await pool.query(
    `INSERT INTO gyms (name, city, state) VALUES ($1, $2, $3)
     ON CONFLICT (name, city, state) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['Peak Performance Gym', 'Los Angeles', 'CA']
  );
  const gymId = gymRes.rows[0].id;
  console.log(`   Gym ID: ${gymId}\n`);

  // ── Trainers ──
  console.log('👨‍💼 Creating trainers...');
  const trainerUsers = [];
  for (const t of trainers) {
    const userRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, email_verified)
       VALUES ($1, $2, 'trainer', true) RETURNING id`,
      [t.email, passwordHash]
    );
    const userId = userRes.rows[0].id;
    await pool.query(
      `INSERT INTO trainer_profiles (user_id, first_name, last_name, gym_id, specialty, certifications, bio, school_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, t.first_name, t.last_name, gymId, t.specialty, t.certifications, t.bio, t.school_name]
    );
    trainerUsers.push({ ...t, id: userId });
    console.log(`   ✓ ${t.first_name} ${t.last_name} (${t.email})`);
  }
  console.log();

  // ── Athletes ──
  console.log('🏀 Creating athletes...');
  const athleteUsers = [];
  for (const a of athletes) {
    const userRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, email_verified)
       VALUES ($1, $2, 'athlete', true) RETURNING id`,
      [a.email, passwordHash]
    );
    const userId = userRes.rows[0].id;
    await pool.query(
      `INSERT INTO athlete_profiles
         (user_id, first_name, last_name, gym_id, age, weight_lbs, height_inches,
          primary_goal, bio, school_name, gpa, graduation_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [userId, a.first_name, a.last_name, gymId, a.age, a.weight_lbs,
       a.height_inches, a.primary_goal, a.bio, a.school_name, a.gpa, a.graduation_year]
    );
    athleteUsers.push({ ...a, id: userId });
    console.log(`   ✓ ${a.first_name} ${a.last_name} (${a.email})`);
  }
  console.log();

  // ── Teams ──
  console.log('👥 Creating teams...');
  const createdTeams = [];
  for (let i = 0; i < teamData.length; i++) {
    const td = teamData[i];
    const trainer = trainerUsers[i % trainerUsers.length];
    const joinKey = generateJoinKey();
    const teamRes = await pool.query(
      `INSERT INTO teams (trainer_id, name, join_key, coach_only)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [trainer.id, td.name, joinKey, td.coach_only]
    );
    const teamId = teamRes.rows[0].id;
    createdTeams.push({ ...td, id: teamId, trainerId: trainer.id, joinKey });
    console.log(`   ✓ "${td.name}" — join key: ${joinKey}`);
  }
  console.log();

  // ── Team members (split athletes across teams) ──
  console.log('➕ Adding athletes to teams...');
  for (let i = 0; i < athleteUsers.length; i++) {
    const athlete = athleteUsers[i];
    const team = createdTeams[i % createdTeams.length];
    await pool.query(
      `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [team.id, athlete.id]
    );
    // Some athletes are on both teams
    if (i % 3 === 0) {
      const otherTeam = createdTeams[(i + 1) % createdTeams.length];
      await pool.query(
        `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [otherTeam.id, athlete.id]
      );
    }
  }
  console.log('   Done.\n');

  // ── Workouts ──
  console.log('💪 Creating workouts...');
  for (const athlete of athleteUsers) {
    const numSessions = randomInt(8, 15);
    for (let s = 0; s < numSessions; s++) {
      const sessionDate = daysAgo(s * 2 + randomInt(0, 2));
      const sessionName = workoutNames[randomInt(0, workoutNames.length - 1)];
      const sessionRes = await pool.query(
        `INSERT INTO workout_sessions (user_id, session_date, session_name, duration_minutes)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [athlete.id, sessionDate, sessionName, randomInt(45, 90)]
      );
      const sessionId = sessionRes.rows[0].id;

      // 3-5 exercises per session
      const numExercises = randomInt(3, 5);
      const shuffled = [...exercises].sort(() => Math.random() - 0.5).slice(0, numExercises);
      for (const ex of shuffled) {
        const weightVariance = randomInt(-20, 20);
        await pool.query(
          `INSERT INTO exercises (session_id, exercise_name, sets, reps, weight_lbs, rpe)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [sessionId, ex.name, ex.sets, ex.reps,
           Math.max(0, ex.weight_lbs + weightVariance), ex.rpe]
        );
      }
    }
  }
  console.log(`   Created workouts for ${athleteUsers.length} athletes.\n`);

  // ── Goals ──
  console.log('🎯 Creating goals...');
  for (const athlete of athleteUsers) {
    const numGoals = randomInt(2, 3);
    const shuffled = [...goalTemplates].sort(() => Math.random() - 0.5).slice(0, numGoals);
    for (const g of shuffled) {
      const achieved = Math.random() > 0.6; // 40% already achieved
      const deadline = daysAgo(-randomInt(30, 120)); // future deadline
      await pool.query(
        `INSERT INTO goals (user_id, title, metric, target_value, comparison, achieved, deadline)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [athlete.id, g.title, g.metric, g.target_value, g.comparison, achieved, deadline]
      );
    }
  }
  console.log('   Done.\n');

  // ── Messages ──
  console.log('💬 Creating team messages...');
  for (const team of createdTeams) {
    // Get members of this team
    const membersRes = await pool.query(
      `SELECT user_id FROM team_members WHERE team_id = $1`,
      [team.id]
    );
    const allSenders = [{ id: team.trainerId }, ...membersRes.rows.map(r => ({ id: r.user_id }))];

    for (let m = 0; m < teamMessages.length; m++) {
      const sender = allSenders[m % allSenders.length];
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - (teamMessages.length - m));
      await pool.query(
        `INSERT INTO messages (team_id, sender_id, content, created_at)
         VALUES ($1, $2, $3, $4)`,
        [team.id, sender.id, teamMessages[m].content, createdAt.toISOString()]
      );
    }
  }
  console.log('   Done.\n');

  // ── Media ──
  console.log('🎬 Creating media...');
  for (let i = 0; i < athleteUsers.length; i++) {
    const athlete = athleteUsers[i];
    const numMedia = randomInt(1, 3);
    const shuffled = [...mediaItems].sort(() => Math.random() - 0.5).slice(0, numMedia);
    for (const item of shuffled) {
      await pool.query(
        `INSERT INTO media (user_id, title, description, url, media_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [athlete.id, item.title, item.description, item.url, item.media_type]
      );
    }
  }
  console.log('   Done.\n');

  // ── Events ──
  console.log('📅 Creating events...');
  const eventTemplates = [
    { title: 'vs Roosevelt High', type: 'game', opponent: 'Roosevelt Bears', location: 'Westside Gym', notes: 'Senior Night — let\'s send them out right.' },
    { title: 'Pre-Season Scrimmage', type: 'game', opponent: 'Lincoln Academy', location: 'Lincoln HS', notes: 'Focus on execution, not the score.' },
    { title: 'Strength Testing Day', type: 'practice', location: 'Peak Performance Gym', notes: 'Bench, squat, deadlift, vert. All athletes must attend.' },
    { title: 'Film Session', type: 'practice', location: 'Westside Classroom B', notes: 'Breaking down last game\'s defense.' },
    { title: 'State Tournament', type: 'game', opponent: 'TBD', location: 'State Arena', notes: 'All season has led to this.' },
  ];
  for (const trainer of trainerUsers) {
    for (let e = 0; e < eventTemplates.length; e++) {
      const ev = eventTemplates[e];
      const eventDate = daysAgo(-randomInt(1, 30));
      await pool.query(
        `INSERT INTO events (trainer_id, title, type, event_date, event_time, location, opponent, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [trainer.id, ev.title, ev.type, eventDate, '15:30', ev.location || null, ev.opponent || null, ev.notes || null]
      );
    }
  }
  console.log('   Done.\n');

  // ── Practice Plans ──
  console.log('📋 Creating practice plans...');
  for (const trainer of trainerUsers) {
    const planRes = await pool.query(
      `INSERT INTO practice_plans (trainer_id, title, plan_date, notes)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [trainer.id, 'Tuesday Skill Development', daysAgo(-2), 'Focus on ball handling and defensive rotations.']
    );
    const planId = planRes.rows[0].id;
    const blocks = [
      { title: 'Warm-Up', duration_minutes: 10, focus_area: 'Mobility', notes: 'Dynamic stretching + activation', sort_order: 1 },
      { title: 'Ball Handling', duration_minutes: 20, focus_area: 'Skill', notes: 'Stationary dribbling, cone drills', sort_order: 2 },
      { title: 'Defensive Rotations', duration_minutes: 25, focus_area: 'Defense', notes: 'Shell drill, help-side positioning', sort_order: 3 },
      { title: '5v5 Scrimmage', duration_minutes: 20, focus_area: 'Live Play', notes: 'Apply concepts from drills', sort_order: 4 },
      { title: 'Cool Down', duration_minutes: 10, focus_area: 'Recovery', notes: 'Static stretching, foam roll', sort_order: 5 },
    ];
    for (const block of blocks) {
      await pool.query(
        `INSERT INTO practice_plan_blocks (plan_id, title, duration_minutes, focus_area, notes, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [planId, block.title, block.duration_minutes, block.focus_area, block.notes, block.sort_order]
      );
    }
  }
  console.log('   Done.\n');

  // ── Summary ──
  console.log('━'.repeat(50));
  console.log('✅ Demo seed complete!\n');
  console.log('Demo login credentials (all accounts):');
  console.log(`  Password: ${DEMO_PASSWORD()}\n`);
  console.log('Trainer accounts:');
  trainers.forEach(t => console.log(`  ${t.email}  →  ${t.first_name} ${t.last_name}`));
  console.log('\nAthlete accounts:');
  athletes.forEach(a => console.log(`  ${a.email}  →  ${a.first_name} ${a.last_name}`));
  console.log('\nTeams:');
  createdTeams.forEach(t => console.log(`  "${t.name}"  →  join key: ${t.joinKey}`));
  console.log('━'.repeat(50));
}

function DEMO_PASSWORD() { return TRAINER_PASSWORD; }

seed()
  .catch(err => { console.error('Seed failed:', err); process.exit(1); })
  .finally(() => pool.end());
