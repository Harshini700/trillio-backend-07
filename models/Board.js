const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "member", "viewer"],
    default: "member",
  },
});

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Board title is required"], 
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    members: [memberSchema],
    background: {
      type: String,
      default: "#0052cc",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);