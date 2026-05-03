const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const socketSetup = require("./sockets/socket");

const app = express();
const server = http.createServer(app);

// ✅ FIX: CORS restricted to your frontend URL only (not "*")
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

//  Make io available in all route handlers via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/auth",     require("./routes/authRoutes"));
app.use("/api/boards",   require("./routes/boardRoutes"));
app.use("/api/cards",    require("./routes/cardRoutes"));
app.use("/api/comments", require("./routes/commentRoutes"));
app.use("/api/activities",    require("./routes/activityRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Global error handler — catches any unhandled errors
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
   if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB' })
  }
  if (err.message?.includes('format')) {
    return res.status(400).json({ error: 'File format not supported' })
  }

  res.status(500).json({ error: "Internal server error" });
});

// Setup Socket.io
socketSetup(io);

//  FIX: Port from env variable, not hardcoded
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));