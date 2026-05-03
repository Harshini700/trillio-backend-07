const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    boardId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Board",
      required: true,
    },
    cardId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Card",
      default: null, // null for board-level actions
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    action: {
      type:     String,
      required: true,
      // e.g. "created card", "moved card to done", "added comment", "uploaded file"
    },
    meta: {
      type:    Object,
      default: {},
      // stores extra info e.g. { cardTitle: "Fix bug", from: "todo", to: "done" }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);