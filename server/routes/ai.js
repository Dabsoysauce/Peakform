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
- Overview/Dashboard: /dashboard — see a summary of recent workouts and activity
- Workouts: /dashboard/workouts — log and view your training sessions
- Film Room: /dashboard/media — upload game film and practice clips (supports video files and YouTube links)
- Messages: /dashboard/messages — send private messages to teammates and coaches
- Team: /dashboard/team — join a team using a join code from your coach, see team chat
- Profile: /dashboard/profile — set your name, age, height, weight, bio, and profile photo

COACH (trainer) features:
- Overview: /trainer — summary dashboard
- My Teams: /trainer/teams — create teams, share join codes with players, post announcements
- Messages: /trainer/messages — send private messages to your players
- Profile: /trainer/profile — set your name, specialty, certifications, bio, and photo

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

const FILM_ANALYSIS_PROMPT = `You are an elite basketball performance analyst with expertise in biomechanics, game strategy, player development, and film study. You have the analytical eye of a top-tier NBA scout combined with the coaching knowledge of a veteran head coach.

Your job is to provide the most insightful, specific, and actionable film analysis possible. You are not generic — you notice the small details that separate good players from great ones.

Analyze the provided film frame(s) and deliver your analysis in this structured format:

**🎬 Situation Read**
Describe exactly what's happening — the game situation, possession type, court spacing, and what moment of the play this captures. Be specific (e.g., "pick-and-roll action at the left elbow" not just "offensive play").

**🔍 Technique Breakdown**
Deep analysis of the primary player's mechanics:
- Footwork and base (stance width, pivot foot, weight distribution)
- Body positioning and balance (hips, shoulders, center of gravity)
- Hand placement and ball security
- Eyes and court vision
- Timing and rhythm of movements

**💪 Strengths Identified**
3-4 specific strengths with basketball terminology. Don't be generic — reference exactly what you see.

**⚠️ Areas for Development**
3-4 specific, actionable coaching points. Each should include:
- What you observe
- Why it matters
- The specific correction

**📊 Tendency Report** (include ONLY if previous analysis history is provided)
Based on patterns across multiple film sessions, identify:
- Recurring strengths the player consistently shows
- Recurring habits or tendencies that need attention
- How the player's game has evolved across sessions

**🏋️ Training Connection** (include ONLY if recent training data is provided)
Connect what you see on film to the player's recent workouts:
- Which exercises are translating to on-court performance
- What training gaps might explain weaknesses you observe
- Specific exercises or drills to add based on this film

**📋 Playbook Recommendations** (include ONLY if play diagrams are provided)
Reference specific plays from the provided playbook BY NAME. Explain:
- Which play(s) would exploit what you see in this film
- Why each recommended play fits the situation
- Any adjustments to the play based on what you observe

**🎯 Priority Action Items**
Top 3 things this player should focus on immediately, ranked by impact. Each should be a concrete drill or habit change, not vague advice.

IMPORTANT GUIDELINES:
- Use proper basketball terminology throughout
- Be specific and reference what you actually see — never give generic advice
- If the image is blurry or doesn't clearly show basketball action, say so honestly
- If multiple frames are provided, analyze progression and movement across frames
- Be constructive but honest — players improve through direct, specific feedback`;

router.post('/analyze-film', authMiddleware, async (req, res) => {
  try {
    const { media_url, base64_frame, base64_frames = [], title, description, focus, player_focus, play_images = [], play_names = [] } = req.body;

    if (!media_url && !base64_frame && base64_frames.length === 0) {
      return res.status(400).json({ error: 'media_url, base64_frame, or base64_frames is required' });
    }

    let imageSource;

    if (base64_frame) {
      imageSource = {
        type: 'base64',
        media_type: 'image/jpeg',
        data: base64_frame,
      };
    } else if (base64_frames.length > 0) {
      // Multiple frames provided — imageSource not needed, frameImages will use base64_frames directly
      imageSource = null;
    } else if (media_url) {
      try {
        imageSource = await fetchAllowedImage(media_url);
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Could not fetch image' });
      }
    }

    // Fetch previous analyses for tendency tracking
    let previousAnalyses = [];
    try {
      const prevRes = await pool.query(
        `SELECT ma.analysis, ma.focus, ma.created_at, m.title
         FROM media_analyses ma
         JOIN media m ON ma.media_id = m.id
         WHERE ma.user_id = $1
         ORDER BY ma.created_at DESC LIMIT 5`,
        [req.user.id]
      );
      previousAnalyses = prevRes.rows;
    } catch {}

    // Fetch recent workout data for training context
    let workoutContext = '';
    try {
      const workoutRes = await pool.query(
        `SELECT ws.created_at, ws.notes,
                json_agg(json_build_object('name', e.exercise_name, 'sets', e.sets, 'reps', e.reps, 'weight', e.weight_lbs)) as exercises
         FROM workout_sessions ws
         LEFT JOIN exercises e ON e.session_id = ws.id
         WHERE ws.user_id = $1
         GROUP BY ws.id
         ORDER BY ws.created_at DESC LIMIT 3`,
        [req.user.id]
      );
      if (workoutRes.rows.length > 0) {
        workoutContext = `\n--- RECENT TRAINING DATA (reference when making training recommendations) ---\n${workoutRes.rows.map(w => `Session (${new Date(w.created_at).toLocaleDateString()}): ${w.exercises?.map(ex => `${ex.name}: ${ex.sets}x${ex.reps}${ex.weight ? ` @ ${ex.weight}lbs` : ''}`).join(', ') || 'No exercises logged'}`).join('\n')}`;
      }
    } catch {}

    const userText = [
      title ? `Film title: "${title}"` : null,
      description ? `Player's note: "${description}"` : null,
      focus ? `Analysis focus: ${focus}` : null,
      player_focus ? `The coach wants to focus on the player at approximately position (${Math.round(player_focus.x * 100)}% from left, ${Math.round(player_focus.y * 100)}% from top) of the frame.` : null,
      play_images.length > 0 ? `The coach has provided ${play_images.length} play diagram(s) from their playbook${play_names.length > 0 ? ` named: ${play_names.map((n, i) => `Play ${i+1}: "${n}"`).join(', ')}` : ''}. Reference these plays BY NAME when recommending which would be effective.` : null,
      previousAnalyses.length > 0 ? `\n--- PREVIOUS ANALYSIS HISTORY (use to identify tendencies and patterns) ---\n${previousAnalyses.map((a, i) => `[${i+1}] "${a.title || 'Untitled'}" (${a.focus || 'general'}, ${new Date(a.created_at).toLocaleDateString()}):\n${a.analysis.substring(0, 500)}${a.analysis.length > 500 ? '...' : ''}`).join('\n\n')}` : null,
      workoutContext || null,
    ].filter(Boolean).join('\n') || 'Please analyze this basketball film.';

    // Build content array — film frame(s) first, then play diagrams
    const frameImages = base64_frames.length > 0
      ? base64_frames.map((f, i) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f } }))
      : [{ type: 'image', source: imageSource }];

    const contentItems = [
      ...frameImages,
      ...play_images.map(png => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: png } })),
      { type: 'text', text: base64_frames.length > 1 ? `[${base64_frames.length} frames extracted at intervals across the video]\n${userText}` : userText },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2500,
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
      model: 'claude-opus-4-6',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: imageSource },
          { type: 'text', text: `You are analyzing a basketball game frame to identify all visible players. For each player you can identify:

1. Estimate their position as a fraction (0.0 to 1.0) of the image width (x) and height (y) from the top-left corner
2. Determine their team based on jersey color/uniform (use "light" and "dark" if you can't determine offense/defense)
3. Estimate their position role if possible (guard, forward, center) based on their court location and build
4. Note what action they appear to be doing (standing, running, shooting, defending, screening, etc.)

Return ONLY a JSON array with this structure, no other text:
[{"id":1,"x":0.3,"y":0.5,"team":"light","role":"guard","action":"dribbling"},{"id":2,"x":0.6,"y":0.4,"team":"dark","role":"forward","action":"defending"}]

Be precise with coordinates — place the marker at the player's center mass. If you cannot identify any players, return an empty array: []` },
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
      model: 'claude-opus-4-6',
      max_tokens: 1200,
      system: FILM_ANALYSIS_PROMPT,
      messages,
    });

    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error('Film chat error:', err?.message || err);
    res.status(500).json({ error: 'Chat failed' });
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
