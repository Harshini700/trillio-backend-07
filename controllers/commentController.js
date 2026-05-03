const Comment  = require("../models/Comment");
const Card     = require("../models/Card");
const Activity = require("../models/Activity");

// ─── Add Comment ──────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { text, cardId } = req.body;

    if (!text || !cardId)
      return res.status(400).json({ error: "text and cardId are required" });

    const card = await Card.findById(cardId);
    if (!card) return res.status(404).json({ error: "Card not found" });

    const comment = await Comment.create({
      text,
      cardId,
      boardId:   card.boardId,
      createdBy: req.user.id,
    });

    await comment.populate("createdBy", "name email");

    // Log activity
    await Activity.create({
      boardId: card.boardId,
      cardId,
      userId:  req.user.id,
      action:  `commented on "${card.title}"`,
      meta:    { text },
    });

    // Emit only to board room — not everyone
    req.io.to(`board_${card.boardId}`).emit("comment:added", comment);
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Comments for a Card ──────────────────────────────
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ cardId: req.params.cardId })
      .populate("createdBy", "name email")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Delete Comment ───────────────────────────────────────
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (comment.createdBy.toString() !== req.user.id)
      return res.status(403).json({ error: "You can only delete your own comments" });

    await Comment.findByIdAndDelete(req.params.commentId);

    req.io.to(`board_${comment.boardId}`).emit("comment:deleted", {
      commentId: comment._id,
      cardId:    comment.cardId,
    });

    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};