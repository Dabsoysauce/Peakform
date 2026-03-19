require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const authRoutes = require('./routes/auth');
const athleteProfileRoutes = require('./routes/athlete-profile');
const trainerProfileRoutes = require('./routes/trainer-profile');
const workoutsRoutes = require('./routes/workouts');
const goalsRoutes = require('./routes/goals');
const mediaRoutes = require('./routes/media');
const teamsRoutes = require('./routes/teams');
const messagesRoutes = require('./routes/messages');
const athletesRoutes = require('./routes/athletes');
const gymsRoutes = require('./routes/gyms');
const dmRoutes = require('./routes/dm');
const schoolsRoutes = require('./routes/schools');
const aiRoutes = require('./routes/ai');
const eventsRoutes = require('./routes/events');
const playsRoutes = require('./routes/plays');
const notificationsRoutes = require('./routes/notifications');
const setupSocket = require('./socket/index');

const session = require('express-session');
const passport = require('passport');

const app = express();
const httpServer = createServer(app);

const allowedOrigins = ['http://localhost:3000', 'https://peakformnow.vercel.app'];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
});

setupSocket(io);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(session({ secret: process.env.JWT_SECRET || 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/athlete-profile', athleteProfileRoutes);
app.use('/api/trainer-profile', trainerProfileRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/athletes', athletesRoutes);
app.use('/api/gyms', gymsRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/plays', playsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'Athlete Edge API' }));

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Athlete Edge API running on port ${PORT}`));
