require('dotenv').config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const {Server} = require("socket.io");
const admin = require("firebase-admin");


const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});




const app = express();
const server = http.createServer(app);

//middlewares
app.use(cors());
app.use(express.json());



const users = {};


function getUserIdFromSocket(socketId) {
  return Object.keys(users).find((key) => users[key] === socketId);
}




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
  if (!userId) return;

  socket.join(userId);
  users[userId] = socket.id; // active users map
  io.emit("user_online", { userId });
  console.log("User joined room:", userId);
});

  // -------------------
  // 📩 Send Message Flow
  // -------------------

  const User = require("../modals/user_modal");

  socket.on("sendMessage", async (data) => {
    console.log("Message received:", data);

    const sender = await User.findOne({ userId: Number(data.senderId) });
    if (!sender) {
      return res.status(404).json({ status: false, message: "Sender not found" });
    }

    const newMessage = new Message({
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message,
      status: "sent", // 👈 default status
      timestamp: new Date(),
      senderName: sender.senderName // 👈 sender's name
    });

    try {
      const msg = await newMessage.save();

     socket.emit("message_sent", {
      localId: data.id,   // 👈 return local id for matching
      messageId: msg._id  // 👈 DB id
    });

    // Emit to receiver
    io.to(data.receiverId).emit("receive_message", msg);
     (async () => {
      try {
        const receiver = await User.findOne({ userId: data.receiverId });

        if (receiver?.device_token) {
          const message = {
            token: receiver.device_token,
            notification: {
              title: sender.senderName,
              body: data.message,
            },
            data: {
              senderId: data.senderId.toString(),
              receiverId: data.receiverId.toString(),
              messageId: msg._id.toString(),
            },
          };

          const response = await admin.messaging().send(message);
          console.log("✅ Notification sent:", response);
        } else {
          console.log("⚠️ No device token found for userId", data.receiverId);
        }
      } catch (err) {
        console.error("❌ Notification error:", err);
      }
    })();

    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // -------------------
  // ✅ Delivered
  // -------------------
  socket.on("message_delivered", async (data) => {
  await Message.findByIdAndUpdate(data.messageId, { status: "delivered" });
  io.to(data.senderId).emit("message_delivered", { messageId: data.messageId });
});

socket.on("message_seen", async (data) => {
  await Message.findByIdAndUpdate(data.messageId, { status: "seen" });
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
  if (userId) {
    delete users[userId];
    io.emit("user_offline", { userId, lastSeen: new Date() });
    console.log("User disconnected:", socket.id, "->", userId);
  }
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


