const Activity = require("../models/Activity");
const Board    = require("../models/Board");

// ─── Get Activity Log for a Board ────────────────────────
exports.getBoardActivity = async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    // Only board members can see activity
    const isMember = board.members.some(
      (m) => m.user.toString() === req.user.id
    );
    if (!isMember && board.createdBy.toString() !== req.user.id)
      return res.status(403).json({ error: "Access denied" });

    const activities = await Activity.find({ boardId: req.params.boardId })
      .populate("userId", "name email")
      .populate("cardId", "title")
      .sort({ createdAt: -1 }) // newest first
      .limit(50);              // last 50 actions

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};