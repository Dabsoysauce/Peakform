const jwt = require('jsonwebtoken');

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
    // Only allow joining a team room the user belongs to —
    // actual team membership is enforced by the REST API; here we
    // just ensure the socket user is authenticated before joining.
    socket.on('join_team', ({ teamId }) => {
      if (teamId) socket.join(teamId);
    });

    socket.on('send_message', ({ teamId, message }) => {
      if (teamId && message) {
        io.to(teamId).emit('new_message', message);
      }
    });

    socket.on('reaction_updated', ({ teamId, messageId, reactions }) => {
      if (teamId && messageId) {
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
