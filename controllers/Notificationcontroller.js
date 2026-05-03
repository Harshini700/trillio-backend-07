const Notification = require("../models/Notification");

// ─── Get All Notifications for logged in user ─────────────
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate("sender", "name email")
      .populate("boardId", "title")
      .populate("cardId", "title")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Mark One Notification as Read ───────────────────────
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ error: "Notification not found" });

    if (notif.recipient.toString() !== req.user.id)
      return res.status(403).json({ error: "Not your notification" });

    notif.isRead = true;
    await notif.save();

    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Mark All Notifications as Read ──────────────────────
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Delete a Notification ────────────────────────────────
exports.deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ error: "Notification not found" });

    if (notif.recipient.toString() !== req.user.id)
      return res.status(403).json({ error: "Not your notification" });

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};