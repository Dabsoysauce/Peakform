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

    socket.on('disconnect', () => {});
  });
};
