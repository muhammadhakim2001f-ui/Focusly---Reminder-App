require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// --- KONFIGURASI MONGODB UNTUK VERCEL ---
// Kita simpan status koneksi di global variable agar tidak connect ulang terus
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return; // Jika sudah connect, pakai yang ada

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "focusly", // Pastikan nama DB dipaksa di sini
      bufferCommands: false, // JANGAN buffering, langsung error kalau gak connect (biar ketahuan)
    });
    isConnected = !!conn.connections[0].readyState;
    console.log("MongoDB Connected to: " + conn.connection.host);
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    // Jangan process.exit(1) di Vercel, nanti serverless function-nya mati total
    throw error;
  }
};

// --- MIDDLEWARE PENTING ---
// Middleware ini memastikan DB connect DULUAN sebelum lanjut ke route lain
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api")) {
    // Hanya cek DB kalau akses API
    try {
      await connectDB();
    } catch (error) {
      return res.status(500).json({ error: "Database Connection Failed" });
    }
  }
  next();
});

// Middleware Standar
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/habits", require("./routes/habits"));
app.use("/api/goals", require("./routes/goals"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/notifications", require("./routes/notifs"));

// Frontend Route
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Untuk local dev, kita connect manual di sini
    connectDB();
  });
}

module.exports = app;
