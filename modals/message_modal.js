const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: { type: Number, required: true },
  receiverId: { type: Number, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

messageSchema.index({ senderId: 1, receiverId: 1, timestamp: 1 });


module.exports = mongoose.model("message_modal", messageSchema);
