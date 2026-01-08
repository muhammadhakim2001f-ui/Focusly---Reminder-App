require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serving Static Files (Agar frontend terbaca di Vercel)
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is missing in Environment Variables!");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("DB Connected"))
    .catch((err) => console.error("DB Connection Error:", err));
}

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/habits", require("./routes/habits"));
app.use("/api/goals", require("./routes/goals"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/notifications", require("./routes/notifs"));

// Frontend Route (Catch-All)
// Menggunakan path.resolve agar aman di lingkungan Serverless
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

// --- BAGIAN INI YANG DIUBAH UNTUK VERCEL ---
const PORT = process.env.PORT || 5000;

// Hanya jalankan app.listen jika di local (bukan di Vercel)
if (require.main === module) {
  app.listen(PORT, () => console.log("Server running on port " + PORT));
}

// Wajib export app agar Vercel bisa menggunakannya
module.exports = app;
