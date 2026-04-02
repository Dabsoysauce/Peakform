const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { authMiddleware, requireRole } = require('../middleware/auth');
const pool = require('../config/db');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// SSRF protection: only allow fetching images from trusted domains
const ALLOWED_URL_PATTERNS = [
  /^https:\/\/.*\.supabase\.co\//,
  /^https:\/\/.*\.supabase\.in\//,
  /^https:\/\/lh3\.googleusercontent\.com\//,
];

function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['https:'].includes(parsed.protocol)) return false;
    return ALLOWED_URL_PATTERNS.some(p => p.test(url));
  } catch {
    return false;
  }
}

async function fetchAllowedImage(url) {
  if (!isAllowedUrl(url)) {
    throw new Error('URL not allowed — only Supabase URLs are accepted');
  }
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error('Could not fetch image');
  const buffer = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  return {
    type: 'base64',
    media_type: contentType.split(';')[0],
    data: Buffer.from(buffer).toString('base64'),
  };
}

const SYSTEM_PROMPT = `You are Athlete Edge's in-app assistant. Athlete Edge is a sports platform built for high school basketball players and their coaches.

Your only job is to help users navigate the app and understand its features. Be concise, friendly, and direct. Never give long responses — 2-3 sentences max unless listing steps.

Here is every feature in the app and where to find it:

PLAYER (athlete) features:
- Overview/Dashboard: /dashboard — see a summary of recent workouts, goals, and activity
- Workouts: /dashboard/workouts — log and view your training sessions
- Goals: /dashboard/goals — set and track performance goals (vertical jump, sprint times, etc.)
- Film Room: /dashboard/media — upload game film and practice clips (supports video files and YouTube links)
- Messages: /dashboard/messages — send private messages to teammates and coaches
- Team: /dashboard/team — join a team using a join code from your coach, see team chat
- Profile: /dashboard/profile — set your name, age, height, weight, primary goal, bio, and profile photo

COACH (trainer) features:
- Overview: /trainer — summary dashboard
- My Teams: /trainer/teams — create teams, share join codes with players, post announcements
- Players: /trainer/athletes — browse and search all players, view their profiles and film
- Messages: /trainer/messages — send private messages to your players
- Profile: /trainer/profile — set your name, specialty, certifications, bio, and photo

SHARED features:
- Public player profiles: accessible at /player/[userId] — shows a player's stats, bio, and film publicly
- Any logged-in user can send a message to a player from their public profile

If a user asks something unrelated to navigation or app features, politely redirect them: "I'm just here to help you navigate Athlete Edge! For training advice, check with your coach."

Always refer to the app as "Athlete Edge". Refer to athletes as "players" and trainers as "coaches".`;

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

    const messages = [
      ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message.trim() },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    });

    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI assistant unavailable' });
  }
});

const FILM_ANALYSIS_PROMPT = `You are an elite basketball performance analyst and coach with deep expertise in player development, biomechanics, and game film analysis. A player or coach has submitted film for analysis.

Analyze the image and provide structured feedback in this exact format:

**What's Happening**
One sentence describing the scene/action captured.

**Technique Assessment**
Analyze the player's form, footwork, body positioning, and mechanics visible in the frame. Be specific about what you observe.

**Strengths**
2-3 bullet points on what the player is doing well.

**Areas to Improve**
2-3 specific, actionable coaching points with corrections.

**Coaching Note**
One key drill or focus point the player should work on based on this film.

**Recommended Plays** (only include this section if play diagrams were provided)
Based on the defense/offense you see in the film, recommend which of the provided play diagrams would be most effective and briefly explain why.

Use proper basketball terminology. Be direct, specific, and constructive. If the image is too blurry, too distant, or doesn't clearly show basketball action, say so and give whatever feedback you can.`;

router.post('/analyze-film', authMiddleware, async (req, res) => {
  try {
    const { media_url, base64_frame, title, description, focus, player_focus, play_images = [] } = req.body;

    if (!media_url && !base64_frame) {
      return res.status(400).json({ error: 'media_url or base64_frame is required' });
    }

    let imageSource;

    if (base64_frame) {
      imageSource = {
        type: 'base64',
        media_type: 'image/jpeg',
        data: base64_frame,
      };
    } else {
      try {
        imageSource = await fetchAllowedImage(media_url);
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Could not fetch image' });
      }
    }

    const userText = [
      title ? `Film title: "${title}"` : null,
      description ? `Player's note: "${description}"` : null,
      focus ? `Analysis focus: ${focus}` : null,
      player_focus ? `The coach wants to focus on the player at approximately position (${Math.round(player_focus.x * 100)}% from left, ${Math.round(player_focus.y * 100)}% from top) of the frame.` : null,
      play_images.length > 0 ? `The coach has also provided ${play_images.length} play diagram(s) from their playbook. In your analysis, recommend which of these plays would be effective based on what you observe in the film.` : null,
    ].filter(Boolean).join('\n') || 'Please analyze this basketball film.';

    // Build content array — film frame first, then play diagrams
    const contentItems = [
      { type: 'image', source: imageSource },
      ...play_images.map(png => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: png } })),
      { type: 'text', text: userText },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: FILM_ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: contentItems }],
    });

    res.json({ analysis: response.content[0].text });
  } catch (err) {
    console.error('Film analysis error:', err?.message || err);
    res.status(500).json({ error: 'Film analysis failed' });
  }
});

// Analyze a play diagram
router.post('/analyze-play', authMiddleware, async (req, res) => {
  try {
    const { canvas_png, name } = req.body;
    if (!canvas_png) return res.status(400).json({ error: 'canvas_png is required' });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: `You are an expert basketball coach and strategist. A coach has drawn a basketball play diagram and wants feedback. Analyze the play and provide structured feedback in this format:

**Play Overview**
Briefly describe what type of play this is and its goal.

**Strengths**
2-3 bullet points on what makes this play effective.

**Weaknesses / How to Defend It**
2-3 bullet points on vulnerabilities and how opposing defenses could stop it.

**Best Used Against**
Describe what defensive schemes or situations this play works best against.

**Coaching Tips**
1-2 specific tips to make this play more effective.

Be concise and use proper basketball terminology.`,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: canvas_png } },
          { type: 'text', text: `This is a basketball play diagram${name ? ` called "${name}"` : ''}. Please analyze it.` },
        ],
      }],
    });

    res.json({ analysis: response.content[0].text });
  } catch (err) {
    console.error('Play analysis error:', err?.message);
    res.status(500).json({ error: 'Play analysis failed' });
  }
});

// Detect players in a film frame — returns approximate positions
router.post('/detect-players', authMiddleware, async (req, res) => {
  try {
    const { media_url, base64_frame } = req.body;

    let imageSource;
    if (base64_frame) {
      imageSource = { type: 'base64', media_type: 'image/jpeg', data: base64_frame };
    } else {
      try {
        imageSource = await fetchAllowedImage(media_url);
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Could not fetch image' });
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: imageSource },
          { type: 'text', text: `Identify all visible basketball players in this image. For each player, estimate their position as a fraction (0.0 to 1.0) of the image width (x) and height (y) from the top-left corner. Return ONLY a JSON array like this, no other text:
[{"id":1,"x":0.3,"y":0.5,"team":"offense"},{"id":2,"x":0.6,"y":0.4,"team":"defense"}]
If you cannot identify any players, return an empty array: []` },
        ],
      }],
    });

    let players = [];
    try {
      const text = response.content[0].text.trim();
      const match = text.match(/\[[\s\S]*\]/);
      if (match) players = JSON.parse(match[0]);
    } catch {}

    res.json({ players });
  } catch (err) {
    console.error('Player detection error:', err?.message);
    res.status(500).json({ error: 'Detection failed' });
  }
});

// Follow-up questions about a specific film (image stays in context)
router.post('/film-chat', authMiddleware, async (req, res) => {
  try {
    const { media_url, base64_frame, history = [], message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message is required' });
    if (!media_url && !base64_frame) return res.status(400).json({ error: 'image source required' });

    let imageSource;
    if (base64_frame) {
      imageSource = { type: 'base64', media_type: 'image/jpeg', data: base64_frame };
    } else {
      try {
        imageSource = await fetchAllowedImage(media_url);
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Could not fetch image' });
      }
    }

    const { focus, player_focus } = req.body;
    const contextText = [
      'Please analyze this basketball film.',
      focus ? `Focus: ${focus}.` : null,
      player_focus ? `Focus on the player at position (${Math.round(player_focus.x * 100)}% from left, ${Math.round(player_focus.y * 100)}% from top).` : null,
    ].filter(Boolean).join(' ');

    // Build message history — image only in the first user turn
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'image', source: imageSource },
          { type: 'text', text: contextText },
        ],
      },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message.trim() },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: FILM_ANALYSIS_PROMPT,
      messages,
    });

    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error('Film chat error:', err?.message || err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Generate a scouting report for a player (trainers only, must be their player)
router.post('/scouting-report', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'trainer') return res.status(403).json({ error: 'Trainers only' });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Verify this player is on one of the trainer's teams
    const membership = await pool.query(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.trainer_id = $2 LIMIT 1`,
      [userId, req.user.id]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: 'Player is not on any of your teams' });

    const [profileRes, sessionsRes, goalsRes, mediaRes] = await Promise.all([
      pool.query('SELECT * FROM athlete_profiles WHERE user_id = $1', [userId]),
      pool.query(
        `SELECT COUNT(*)::int as total_sessions,
                AVG(duration_minutes)::int as avg_duration,
                MAX(session_date) as last_session
         FROM workout_sessions WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        'SELECT title, metric, target_value, achieved FROM goals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 6',
        [userId]
      ),
      pool.query('SELECT COUNT(*)::int as film_count FROM media WHERE user_id = $1', [userId]),
    ]);

    const profile = profileRes.rows[0];
    const stats = sessionsRes.rows[0];
    const goals = goalsRes.rows;
    const filmCount = mediaRes.rows[0]?.film_count || 0;

    if (!profile || (stats.total_sessions === 0 && goals.length === 0 && !profile.bio && !profile.primary_goal)) {
      return res.status(400).json({ error: 'Not enough profile data to generate a scouting report' });
    }

    function heightDisplay(inches) {
      if (!inches) return 'N/A';
      return `${Math.floor(inches / 12)}'${inches % 12}"`;
    }

    const goalsText = goals.length > 0
      ? goals.map(g => `- ${g.title}: ${g.metric} target ${g.target_value} (${g.achieved ? 'achieved' : 'in progress'})`).join('\n')
      : 'No goals logged';

    const lastSession = stats.last_session
      ? new Date(stats.last_session).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';

    const prompt = `Generate a professional ~200-word basketball scouting report for the following player. Write in third person as if you are a college scout. Reference specific data points. Do not invent stats not present. Output only the report text.

Name: ${profile.first_name || 'Unknown'} ${profile.last_name || ''} | Age: ${profile.age || 'N/A'} | Height: ${heightDisplay(profile.height_inches)} | Weight: ${profile.weight_lbs ? profile.weight_lbs + ' lbs' : 'N/A'}
School: ${profile.school_name || 'N/A'} | Grad year: ${profile.graduation_year || 'N/A'} | GPA: ${profile.gpa != null ? parseFloat(profile.gpa).toFixed(2) : 'N/A'}
Goal: ${profile.primary_goal || 'N/A'} | Bio: ${profile.bio || 'N/A'}

Training: ${stats.total_sessions} sessions logged, avg ${stats.avg_duration || 0} min, last session ${lastSession}
Film: ${filmCount} clips uploaded

Goals:
${goalsText}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({ analysis: response.content[0].text });
  } catch (err) {
    console.error('Scouting report error:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate scouting report' });
  }
});

// Generate a play from a coach's team description
router.post('/generate-play', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

    const SYSTEM = `You are an elite basketball coach and play designer. A coach will describe their team's players, strengths, and struggles. Your job is to design a basketball play perfectly tailored to that team.

The play will be drawn on a half-court canvas with these dimensions and coordinate system:
- Canvas: 560 wide x 440 tall (pixels)
- Basket: x=280, y=380 (bottom-center)
- Key/paint: x=208–352, y=213–395
- Free-throw line: y=213, x=208–352
- Three-point arc top: ~y=170 at x=280
- Wings: left ~(130, 210), right ~(430, 210)
- Corners: left ~(90, 375), right ~(470, 375)
- Top of key: ~(280, 140)
- Elbows: left ~(208, 213), right ~(352, 213)
- High post: ~(280, 230)
- Low post: left ~(230, 310), right ~(330, 310)

Offense players are white circles labeled 1–5 (1=PG, 2=SG, 3=SF, 4=PF, 5=C).
Defense players are red X marks.
Lines: "cut" (solid arrow), "pass" (dashed arrow), "drive" (wavy arrow).
Screens are perpendicular bars.

Have a natural conversation to understand the team. Ask follow-up questions if needed. Once you have enough info to design a great play, respond with your explanation AND include a JSON block at the end in this exact format (no markdown around it):

PLAY_JSON_START
{
  "name": "Play Name",
  "players": [
    {"type":"offense","x":280,"y":140,"label":"1"},
    {"type":"offense","x":130,"y":210,"label":"2"},
    {"type":"offense","x":430,"y":210,"label":"3"},
    {"type":"offense","x":230,"y":310,"label":"4"},
    {"type":"offense","x":330,"y":310,"label":"5"}
  ],
  "lines": [
    {"type":"cut","x1":280,"y1":140,"x2":208,"y2":213},
    {"type":"pass","x1":280,"y1":140,"x2":130,"y2":210}
  ],
  "screens": []
}
PLAY_JSON_END

Only include the JSON when you are ready to present a complete play. During the conversation, just chat normally.`;

    const messages = [
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message.trim() },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM,
      messages,
    });

    const text = response.content[0].text;

    // Extract play JSON if present
    let play = null;
    const match = text.match(/PLAY_JSON_START\s*([\s\S]*?)\s*PLAY_JSON_END/);
    if (match) {
      try { play = JSON.parse(match[1]); } catch {}
    }

    const reply = text.replace(/PLAY_JSON_START[\s\S]*?PLAY_JSON_END/, '').trim();

    res.json({ reply, play });
  } catch (err) {
    console.error('Generate play error:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate play' });
  }
});

// Generate a full workout plan for a player (trainer only)
router.post('/generate-workout', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { userId, goals, weaknesses, fitness_level, focus_areas, duration_days = 5 } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Verify player is on one of this trainer's teams
    const membership = await pool.query(
      `SELECT 1 FROM team_members tm
       JOIN teams t ON tm.team_id = t.id
       WHERE tm.user_id = $1 AND t.trainer_id = $2 LIMIT 1`,
      [userId, req.user.id]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: 'Player is not on any of your teams' });

    // Fetch player profile for context
    const profileRes = await pool.query('SELECT * FROM athlete_profiles WHERE user_id = $1', [userId]);
    const profile = profileRes.rows[0];

    const playerInfo = profile ? [
      (profile.first_name || profile.last_name) ? `Name: ${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null,
      profile.age ? `Age: ${profile.age}` : null,
      profile.height_inches ? `Height: ${Math.floor(profile.height_inches / 12)}'${profile.height_inches % 12}"` : null,
      profile.weight_lbs ? `Weight: ${profile.weight_lbs} lbs` : null,
      profile.primary_goal ? `Primary goal: ${profile.primary_goal}` : null,
    ].filter(Boolean).join(', ') : 'No profile data available';

    const days = Math.min(Math.max(parseInt(duration_days) || 5, 1), 14);

    const prompt = `You are an elite basketball strength and conditioning coach. Generate a structured ${days}-day workout plan for a basketball player.

Player info: ${playerInfo}
Coach-specified goals: ${goals || 'General athleticism'}
Weaknesses to address: ${weaknesses || 'Not specified'}
Fitness level: ${fitness_level || 'intermediate'}
Focus areas: ${focus_areas || 'Overall basketball performance'}

Return ONLY a valid JSON object with this exact structure, no markdown, no extra text:
{
  "plan_name": "string",
  "description": "string (2-3 sentences explaining the training approach)",
  "workouts": [
    {
      "day": 1,
      "session_name": "string",
      "duration_minutes": number,
      "focus": "string",
      "notes": "string (coaching tips for this session)",
      "exercises": [
        {
          "exercise_name": "string",
          "sets": number,
          "reps": number,
          "weight_lbs": number or null,
          "notes": "string (form cues or intensity guidance)"
        }
      ]
    }
  ]
}

Include exactly ${days} workout sessions. Use basketball-specific exercises (box jumps, lateral shuffles, etc.). Be specific with sets/reps. Use null for weight_lbs on bodyweight or band exercises.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    });

    let plan;
    try {
      const text = response.content[0].text.trim();
      const match = text.match(/\{[\s\S]*\}/);
      plan = JSON.parse(match ? match[0] : text);
    } catch {
      return res.status(500).json({ error: 'Failed to parse generated workout plan' });
    }

    res.json({ plan });
  } catch (err) {
    console.error('Generate workout error:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
});

// Share an analysis to all team members as a DM
router.post('/share-to-team', authMiddleware, requireRole('trainer'), async (req, res) => {
  try {
    const { content, title, type, image_url } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const icon = type === 'play' ? '📋' : '🎬';
    const label = type === 'play' ? 'Play Analysis' : 'Film Analysis';
    const header = `${icon} ${label}${title ? `: "${title}"` : ''}\n${'─'.repeat(32)}\n`;
    const message = header + content;

    const members = await pool.query(
      `SELECT DISTINCT tm.user_id FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE t.trainer_id = $1`,
      [req.user.id]
    );

    let sent = 0;
    for (const member of members.rows) {
      try {
        // Send play/film image first if provided
        if (image_url) {
          await pool.query(
            'INSERT INTO direct_messages (sender_id, recipient_id, content, media_url, media_type) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, member.user_id, '', image_url, 'image']
          );
        }
        // Then send the analysis text
        await pool.query(
          'INSERT INTO direct_messages (sender_id, recipient_id, content) VALUES ($1, $2, $3)',
          [req.user.id, member.user_id, message]
        );
        sent++;
      } catch (insertErr) {
        console.error('DM insert error:', insertErr?.message);
      }
    }

    res.json({ success: true, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to share analysis' });
  }
});

module.exports = router;
