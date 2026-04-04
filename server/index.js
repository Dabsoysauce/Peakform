require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Strict limit for auth endpoints — prevents brute force and credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit AI endpoints — each call hits the Anthropic API and costs money
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many AI requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limit — catch-all to prevent abuse
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authRoutes = require('./routes/auth');
const athleteProfileRoutes = require('./routes/athlete-profile');
const trainerProfileRoutes = require('./routes/trainer-profile');
const workoutsRoutes = require('./routes/workouts');

const mediaRoutes = require('./routes/media');
const teamsRoutes = require('./routes/teams');
const messagesRoutes = require('./routes/messages');
const gymsRoutes = require('./routes/gyms');
const dmRoutes = require('./routes/dm');
const schoolsRoutes = require('./routes/schools');
const aiRoutes = require('./routes/ai');
const eventsRoutes = require('./routes/events');
const playsRoutes = require('./routes/plays');
const notificationsRoutes = require('./routes/notifications');
const practicePlansRoutes = require('./routes/practice-plans');
const practicePlanTemplatesRoutes = require('./routes/practice-plan-templates');
const trainerMediaRoutes = require('./routes/trainer-media');
const depthChartRoutes = require('./routes/depth-chart');

const setupSocket = require('./socket/index');

const session = require('express-session');
const passport = require('passport');

const app = express();
const httpServer = createServer(app);

const allowedOrigins = ['http://localhost:3000', 'https://peakformnow.vercel.app', 'https://athleteedge.pro', 'https://www.athleteedge.pro'];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
});

setupSocket(io);

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '0'); // disabled in favor of CSP
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/athlete-profile', athleteProfileRoutes);
app.use('/api/trainer-profile', trainerProfileRoutes);
app.use('/api/workouts', workoutsRoutes);

app.use('/api/media', mediaRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/gyms', gymsRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/plays', playsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/practice-plans', practicePlansRoutes);
app.use('/api/practice-plan-templates', practicePlanTemplatesRoutes);
app.use('/api/trainer-media', trainerMediaRoutes);
app.use('/api/depth-chart', depthChartRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'Athlete Edge API' }));

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Athlete Edge API running on port ${PORT}`));
