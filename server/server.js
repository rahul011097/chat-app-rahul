const express = require("express");
const http = require("http");
const cors = require("cors");
const moongoose = require("mongoose");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);

//middlewares
app.use(cors());
app.use(express.json());

//database connection
moongoose.connect(
  "mongodb+srv://softhuntersrahulkumar_db_user:FHewlCrDouFfozVe@cluster0.e0hokua.mongodb.net/chat-app"
).then(() => console.log("DB connected"))
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

  // Listen for messages
  socket.on("sendMessage", (data) => {
    console.log("Message received:", data);

    // Save message to DB (MongoDB)
    const newMessage = new Message({
        senderId: data.senderId,
       receiverId: data.receiverId,
        message: data.message,
        timestamp: new Date(),
      });
    newMessage.save();

    // Broadcast message to receiver
    io.to(data.reciverId).emit("receiveMessage", newMessage);
  });

  // Join room with userId (for private chat)
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log("User joined room:", userId);
  });

  socket.on("disconnect", () => {
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

  server.listen(5001,'0.0.0.0', () => {
    console.log("Server is running on port 5001");
  });

