require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", require("./routes/auth"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "PICS Backend is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
