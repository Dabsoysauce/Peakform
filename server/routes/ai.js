const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

Use proper basketball terminology. Be direct, specific, and constructive. If the image is too blurry, too distant, or doesn't clearly show basketball action, say so and give whatever feedback you can.`;

router.post('/analyze-film', authMiddleware, async (req, res) => {
  try {
    const { media_url, base64_frame, title, description } = req.body;

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
      // Fetch the image from Supabase and convert to base64 to avoid CORS issues
      const imgRes = await fetch(media_url);
      if (!imgRes.ok) return res.status(400).json({ error: 'Could not fetch image' });
      const buffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      imageSource = {
        type: 'base64',
        media_type: contentType.split(';')[0],
        data: Buffer.from(buffer).toString('base64'),
      };
    }

    const userText = [
      title ? `Film title: "${title}"` : null,
      description ? `Player's note: "${description}"` : null,
    ].filter(Boolean).join('\n') || 'Please analyze this basketball film.';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: FILM_ANALYSIS_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: imageSource },
            { type: 'text', text: userText },
          ],
        },
      ],
    });

    res.json({ analysis: response.content[0].text });
  } catch (err) {
    console.error('Film analysis error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Film analysis failed' });
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
      const imgRes = await fetch(media_url);
      const buffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      imageSource = { type: 'base64', media_type: contentType.split(';')[0], data: Buffer.from(buffer).toString('base64') };
    }

    // Build message history — image only in the first user turn
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'image', source: imageSource },
          { type: 'text', text: 'Please analyze this basketball film.' },
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
    res.status(500).json({ error: err?.message || 'Chat failed' });
  }
});

module.exports = router;
