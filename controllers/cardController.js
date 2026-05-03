const Card         = require("../models/Card");
const Board        = require("../models/Board");
const Activity     = require("../models/Activity");
const Notification = require("../models/Notification");
const { cloudinary } = require("../config/cloudinary");

// ─── Helper: check board membership ──────────────────────
const getMember = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board) return { error: "Board not found" };
  const member = board.members.find((m) => m.user.toString() === userId);
  if (!member) return { error: "You are not a member of this board" };
  return { member, board };
};

// ─── Create Card ──────────────────────────────────────────
exports.createCard = async (req, res) => {
  try {
    const { title, description, boardId, status, dueDate, assignedTo } = req.body;

    if (!title || !boardId)
      return res.status(400).json({ error: "title and boardId are required" });

    const { member, board, error } = await getMember(boardId, req.user.id);
    if (error) return res.status(403).json({ error });
    if (member.role === "viewer")
      return res.status(403).json({ error: "Viewers cannot create cards" });

    const card = await Card.create({
      title,
      description: description || "",
      boardId,
      status:      status     || "todo",
      dueDate:     dueDate    || null,
      assignedTo:  assignedTo || null,
      createdBy:   req.user.id,
    });

    await card.populate("createdBy", "name email");
    await card.populate("assignedTo", "name email");

    //  Log activity
    await Activity.create({
      boardId,
      cardId:  card._id,
      userId:  req.user.id,
      action:  `created card "${title}"`,
      meta:    { cardTitle: title, status: card.status },
    });

    //  Notify assigned user if different from creator
    if (assignedTo && assignedTo !== req.user.id) {
      const notif = await Notification.create({
        recipient: assignedTo,
        sender:    req.user.id,
        boardId,
        cardId:    card._id,
        message:   `${req.user.name} assigned you to card "${title}"`,
      });
      req.io.to(`user_${assignedTo}`).emit("notification:new", notif);
    }

    req.io.to(`board_${boardId}`).emit("card:created", card);
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Cards for a Board ────────────────────────────────
exports.getCards = async (req, res) => {
  try {
    const { search } = req.query;

    const query = { boardId: req.params.boardId };
    if (search) {
      query.title = { $regex: search, $options: "i" }; // case-insensitive search
    }

    const cards = await Card.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ order: 1 });

    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Update Card ──────────────────────────────────────────
exports.updateCard = async (req, res) => {
  try {
    const { title, description, status, assignedTo, dueDate, order } = req.body;

    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found" });

    const { member, error } = await getMember(card.boardId, req.user.id);
    if (error) return res.status(403).json({ error });
    if (member.role === "viewer")
      return res.status(403).json({ error: "Viewers cannot edit cards" });

    const oldStatus = card.status;

    const updated = await Card.findByIdAndUpdate(
      req.params.cardId,
      { title, description, status, assignedTo, dueDate, order },
      { new: true }
    )
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    //  Log activity — different message if status changed
    if (status && status !== oldStatus) {
      await Activity.create({
        boardId: card.boardId,
        cardId:  card._id,
        userId:  req.user.id,
        action:  `moved card "${card.title}" to ${status}`,
        meta:    { from: oldStatus, to: status },
      });

      // Notify assigned user when card moves to done
      if (status === "done" && card.assignedTo && card.assignedTo.toString() !== req.user.id) {
        const notif = await Notification.create({
          recipient: card.assignedTo,
          sender:    req.user.id,
          boardId:   card.boardId,
          cardId:    card._id,
          message:   `${req.user.name} marked "${card.title}" as done`,
        });
        req.io.to(`user_${card.assignedTo}`).emit("notification:new", notif);
      }
    } else {
      await Activity.create({
        boardId: card.boardId,
        cardId:  card._id,
        userId:  req.user.id,
        action:  `updated card "${card.title}"`,
      });
    }

    req.io.to(`board_${card.boardId}`).emit("card:updated", updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Delete Card ──────────────────────────────────────────
exports.deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found" });

    const { member, error } = await getMember(card.boardId, req.user.id);
    if (error) return res.status(403).json({ error });
    if (member.role === "viewer")
      return res.status(403).json({ error: "Viewers cannot delete cards" });

    // Delete attachments from Cloudinary
    if (card.attachments?.length > 0) {
      for (const att of card.attachments) {
        if (att.publicId) await cloudinary.uploader.destroy(att.publicId);
      }
    }

    await Card.findByIdAndDelete(req.params.cardId);

    await Activity.create({
      boardId: card.boardId,
      userId:  req.user.id,
      action:  `deleted card "${card.title}"`,
    });

    req.io.to(`board_${card.boardId}`).emit("card:deleted", { cardId: card._id });
    res.json({ message: "Card deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Upload Attachment to Card ────────────────────────────
exports.uploadAttachment = async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found" });

    const { member, error } = await getMember(card.boardId, req.user.id);
    if (error) return res.status(403).json({ error });
    if (member.role === "viewer")
      return res.status(403).json({ error: "Viewers cannot upload files" });

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Cloudinary file details come from multer-storage-cloudinary
    const attachment = {
      filename: req.file.originalname,
      url:      req.file.path,       // Cloudinary URL
      publicId: req.file.filename,   // Cloudinary public_id
    };

    card.attachments.push(attachment);
    await card.save();

    await Activity.create({
      boardId: card.boardId,
      cardId:  card._id,
      userId:  req.user.id,
      action:  `uploaded file to "${card.title}"`,
      meta:    { filename: req.file.originalname },
    });

    req.io.to(`board_${card.boardId}`).emit("card:updated", card);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Delete Attachment from Card ─────────────────────────
exports.deleteAttachment = async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found" });

    const attachment = card.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ error: "Attachment not found" });

    // Delete from Cloudinary
    if (attachment.publicId) {
      await cloudinary.uploader.destroy(attachment.publicId);
    }

    card.attachments.pull(req.params.attachmentId);
    await card.save();

    req.io.to(`board_${card.boardId}`).emit("card:updated", card);
    res.json({ message: "Attachment deleted", card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Reorder Cards (drag & drop) ─────────────────────────
exports.reorderCards = async (req, res) => {
  try {
    const { cards } = req.body; // [{ _id, order, status }]
    if (!cards || !Array.isArray(cards))
      return res.status(400).json({ error: "cards array is required" });

    const updates  = cards.map((c) =>
      Card.findByIdAndUpdate(c._id, { order: c.order, status: c.status }, { new: true })
    );
    const updated  = await Promise.all(updates);
    const boardId  = updated[0]?.boardId;

    req.io.to(`board_${boardId}`).emit("cards:reordered", updated);
    res.json({ message: "Reordered", cards: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};