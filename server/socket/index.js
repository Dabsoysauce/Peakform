const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = (io) => {
  // Verify JWT on every socket connection before allowing any events
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Verify team membership before allowing a user to join a team room
    socket.on('join_team', async ({ teamId }) => {
      if (!teamId) return;
      try {
        let allowed;
        if (socket.user.role === 'trainer') {
          const res = await pool.query('SELECT 1 FROM teams WHERE id = $1 AND trainer_id = $2', [teamId, socket.user.id]);
          allowed = res.rows.length > 0;
        } else {
          const res = await pool.query('SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, socket.user.id]);
          allowed = res.rows.length > 0;
        }
        if (allowed) {
          socket.join(teamId);
        }
      } catch (err) {
        console.error('join_team membership check failed:', err.message);
      }
    });

    // Verify sender is in the team room before broadcasting
    socket.on('send_message', ({ teamId, message }) => {
      if (teamId && message && socket.rooms.has(teamId)) {
        io.to(teamId).emit('new_message', message);
      }
    });

    socket.on('reaction_updated', ({ teamId, messageId, reactions }) => {
      if (teamId && messageId && socket.rooms.has(teamId)) {
        io.to(teamId).emit('reaction_updated', { messageId, reactions });
      }
    });

    // DM: users can only join their own personal room
    socket.on('join_dm', ({ userId }) => {
      if (userId && userId === socket.user.id) {
        socket.join(`dm:${userId}`);
      }
    });

    // DM: relay message to recipient's room
    socket.on('send_dm', ({ recipientId, message }) => {
      if (recipientId && message) {
        io.to(`dm:${recipientId}`).emit('new_dm', message);
      }
    });

    socket.on('dm_reaction_updated', ({ recipientId, messageId, reactions }) => {
      if (recipientId && messageId) {
        io.to(`dm:${recipientId}`).emit('dm_reaction_updated', { messageId, reactions });
      }
    });

    socket.on('disconnect', () => {});
  });
};
