const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true, // who receives the notification
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true, // who triggered it
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Board",
    },
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Card",
    },
    message: {
      type:     String,
      required: true,
      // e.g. "Harshini assigned you to card 'Fix login bug'"
    },
    isRead: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);