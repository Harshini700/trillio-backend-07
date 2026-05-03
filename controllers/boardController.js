const Board    = require("../models/Board");
const Activity = require("../models/Activity");

// ─── Create Board ─────────────────────────────────────────
exports.createBoard = async (req, res) => {
  try {
    const { title, description, background } = req.body;

    if (!title)
      return res.status(400).json({ error: "Board title is required" });

    const board = await Board.create({
      title,
      description: description || "",
      background:  background  || "#0052cc",
      createdBy:   req.user.id,
      members:     [{ user: req.user.id, role: "admin" }],
    });

    // Log activity
    await Activity.create({
      boardId: board._id,
      userId:  req.user.id,
      action:  "created board",
      meta:    { boardTitle: title },
    });

    req.io.emit("board:created", board);
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get All Boards for user ──────────────────────────────
exports.getBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ createdBy: req.user.id }, { "members.user": req.user.id }],
    }).populate("createdBy", "name email");

    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Single Board ─────────────────────────────────────
exports.getBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId)
      .populate("createdBy", "name email")
      .populate("members.user", "name email");

    if (!board) return res.status(404).json({ error: "Board not found" });

    const isMember = board.members.some(
      (m) => m.user._id.toString() === req.user.id
    );
    if (!isMember && board.createdBy._id.toString() !== req.user.id)
      return res.status(403).json({ error: "Access denied" });

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Update Board ─────────────────────────────────────────
exports.updateBoard = async (req, res) => {
  try {
    const { title, description, background } = req.body;
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    const member  = board.members.find((m) => m.user.toString() === req.user.id);
    const isAdmin = board.createdBy.toString() === req.user.id || member?.role === "admin";
    if (!isAdmin) return res.status(403).json({ error: "Only admins can update the board" });

    board.title       = title       || board.title;
    board.description = description ?? board.description;
    board.background  = background  || board.background;
    await board.save();

    await Activity.create({
      boardId: board._id,
      userId:  req.user.id,
      action:  "updated board",
      meta:    { boardTitle: board.title },
    });

    req.io.to(`board_${board._id}`).emit("board:updated", board);
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Delete Board ─────────────────────────────────────────
exports.deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (board.createdBy.toString() !== req.user.id)
      return res.status(403).json({ error: "Only the owner can delete the board" });

    await Board.findByIdAndDelete(req.params.boardId);
    req.io.emit("board:deleted", { boardId: req.params.boardId });
    res.json({ message: "Board deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Add Member ───────────────────────────────────────────
exports.addMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const User = require("../models/User");

    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    const requester = board.members.find((m) => m.user.toString() === req.user.id);
    if (!requester || requester.role !== "admin")
      return res.status(403).json({ error: "Only admins can add members" });

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ error: "User not found" });

    const alreadyMember = board.members.some(
      (m) => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) return res.status(400).json({ error: "User is already a member" });

    board.members.push({ user: userToAdd._id, role: role || "member" });
    await board.save();

    await Activity.create({
      boardId: board._id,
      userId:  req.user.id,
      action:  `added ${userToAdd.name} as ${role || "member"}`,
    });

    req.io.to(`board_${board._id}`).emit("board:memberAdded", { board });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Remove Member ────────────────────────────────────────
exports.removeMember = async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    const requester = board.members.find((m) => m.user.toString() === req.user.id);
    if (!requester || requester.role !== "admin")
      return res.status(403).json({ error: "Only admins can remove members" });

    board.members = board.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await board.save();

    req.io.to(`board_${board._id}`).emit("board:memberRemoved", {
      boardId: board._id,
      userId:  req.params.userId,
    });
    res.json({ message: "Member removed", board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};