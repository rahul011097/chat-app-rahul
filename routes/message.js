const express = require("express");
const router = express.Router();
const Message = require("../modals/message_modal");
const verifyToken = require("../middlware/verify_token");

// Send message
router.post("/send", verifyToken, async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;
    if (!senderId || !receiverId || !message?.trim()) {
      return res.status(400).json({ status: false, message: "Missing fields" });
    }

    const doc = await Message.create({
      senderId: Number(senderId),
      receiverId: Number(receiverId),
      message: message.trim()
    });

    return res.status(201).json({ status: true, data: doc });
  } catch (e) {
    return res.status(500).json({ status: false, error: e.message });
  }
});

// Get chat (two users)
router.get("/:senderId/:receiverId", verifyToken, async (req, res) => {
  try {
    const senderId = Number(req.params.senderId);
    const receiverId = Number(req.params.receiverId);

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ timestamp: 1 });

    return res.status(200).json({ status: true, messages });
  } catch (e) {
    return res.status(500).json({ status: false, error: e.message });
  }
});

module.exports = router;
