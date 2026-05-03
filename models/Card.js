const mongoose = require("mongoose");


const attachmentSchema = new mongoose.Schema({
  filename:   { type: String },
  url:        { type: String },
  publicId:   { type: String },
  uploadedAt: { type: Date, default: Date.now },
})
const cardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Card title is required"], 
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true, 
    },
    status: {
      type: String,
      enum: ["todo", "inprogress", "done"],
      default: "todo",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    order: {
      type: Number,
      default: 0, //  FIX: needed for drag & drop ordering
    },
    attachments: [attachmentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Card", cardSchema);