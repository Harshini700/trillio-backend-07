module.exports = (io) => {
  const onlineUsers = {}; // { userId: socketId }

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ── User joins their personal room (for notifications) ──
    socket.on("user:join", (userId) => {
      if (!userId) return;
      onlineUsers[userId] = socket.id;
      socket.join(`user_${userId}`);
      io.emit("users:online", Object.keys(onlineUsers));
    });

    // ── User joins a board room (for realtime card/comment sync) ──
    socket.on("board:join", (boardId) => {
      if (!boardId) return;
      socket.join(`board_${boardId}`);
      console.log(`Socket ${socket.id} joined board_${boardId}`);
    });

    // ── User leaves a board room ──
    socket.on("board:leave", (boardId) => {
      if (!boardId) return;
      socket.leave(`board_${boardId}`);
    });

    // ── Typing indicator for comments ──
    socket.on("comment:typing", ({ boardId, cardId, userName }) => {
      socket.to(`board_${boardId}`).emit("comment:typing", { cardId, userName });
    });

    socket.on("comment:stopTyping", ({ boardId, cardId }) => {
      socket.to(`board_${boardId}`).emit("comment:stopTyping", { cardId });
    });

    // ── Disconnect ──
    socket.on("disconnect", () => {
      const userId = Object.keys(onlineUsers).find(
        (key) => onlineUsers[key] === socket.id
      );
      if (userId) {
        delete onlineUsers[userId];
        io.emit("users:online", Object.keys(onlineUsers));
      }
      console.log("Socket disconnected:", socket.id);
    });
  });

  // ── Socket event reference (emitted from controllers via req.io) ──
  //
  // Board events  → board:created, board:updated, board:deleted
  //                 board:memberAdded, board:memberRemoved
  //
  // Card events   → card:created, card:updated, card:deleted
  //                 cards:reordered
  //
  // Comment events → comment:added, comment:deleted
  //                  comment:typing, comment:stopTyping
  //
  // Notification  → notification:new  (to user_${userId} room)
  //
  // Online users  → users:online      (to all)
};