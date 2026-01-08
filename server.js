require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/focusly").then(() => console.log("DB Connected"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/habits", require("./routes/habits"));
app.use("/api/goals", require("./routes/goals"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/notifications", require("./routes/notifs"));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
// Kode Baru
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));

// PENTING: Tambahkan baris ini agar Vercel bisa membacanya
module.exports = app;
