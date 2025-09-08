require('dotenv').config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const {Server} = require("socket.io");


const app = express();
const server = http.createServer(app);

//middlewares
app.use(cors());
app.use(express.json());

//database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("DB connected"))
  .catch((err) => console.log(err));

//socket.io connection
const io = new Server(server, {
  cors: {
    origin: "*",  // Flutter app ke liye allow
  },
});

const Message = require("../modals/message_modal");

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join user room
  socket.on("join", (userId) => {
    socket.join(userId);
     users[userId] = socket.id; // active users map
  io.emit("user_online", { userId });
    console.log("User joined room:", userId);
  });

  // -------------------
  // 📩 Send Message Flow
  // -------------------
  socket.on("sendMessage", async (data) => {
    console.log("Message received:", data);

    const newMessage = new Message({
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message,
      status: "sent", // 👈 default status
      timestamp: new Date(),
    });

    try {
      const msg = await newMessage.save();

      // Ack to sender (SENT)
      socket.emit("message_sent", { messageId: msg._id });

      // Emit to receiver
      io.to(data.receiverId).emit("receive_message", msg);

    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // -------------------
  // ✅ Delivered
  // -------------------
  socket.on("message_delivered", async (data) => {
    console.log("Delivered:", data);

    // Update DB
    await Message.findByIdAndUpdate(data.messageId, { status: "delivered" });

    // Notify sender
    io.to(data.senderId).emit("message_delivered", { messageId: data.messageId });
  });

  // -------------------
  // 👀 Seen
  // -------------------
  socket.on("message_seen", async (data) => {
    console.log("Seen:", data);

    // Update DB
    await Message.findByIdAndUpdate(data.messageId, { status: "seen" });

    // Notify sender
    io.to(data.senderId).emit("message_seen", { messageId: data.messageId });
  });

  // 🔵 User Typing
socket.on("typing", (data) => {
  console.log("Typing event:", data);

  // Notify receiver
  io.to(data.receiverId).emit("typing", {
    senderId: data.senderId,
    isTyping: true,
  });
});

// 🔴 User Stopped Typing
socket.on("stop_typing", (data) => {
  console.log("Stop typing:", data);

  // Notify receiver
  io.to(data.receiverId).emit("typing", {
    senderId: data.senderId,
    isTyping: false,
  });
});


  socket.on("disconnect", () => {
    const userId = getUserIdFromSocket(socket.id);
  delete users[userId];
  io.emit("user_offline", { userId, lastSeen: new Date() });
    console.log("User disconnected:", socket.id);
  });
});




//Test Api

app.get("/", (req, res) => {
  res.send("Chat App Server is running");    
});

//auth routes
app.use("/api/auth", require("../routes/auth"));


//message routes
app.use("/api/message", require("../routes/message"));



  
//server listening

 const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});


