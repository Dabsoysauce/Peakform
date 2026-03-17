module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_team', ({ teamId }) => {
      if (teamId) socket.join(teamId);
    });

    socket.on('send_message', ({ teamId, message }) => {
      if (teamId && message) {
        io.to(teamId).emit('new_message', message);
      }
    });

    // DM: each user joins their own personal room
    socket.on('join_dm', ({ userId }) => {
      if (userId) socket.join(`dm:${userId}`);
    });

    // DM: relay message to recipient's room
    socket.on('send_dm', ({ recipientId, message }) => {
      if (recipientId && message) {
        io.to(`dm:${recipientId}`).emit('new_dm', message);
      }
    });

    socket.on('disconnect', () => {});
  });
};
