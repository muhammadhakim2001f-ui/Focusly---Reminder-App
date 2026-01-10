const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Habit",
  new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Kita ganti 'userId' jadi 'user' agar cocok dengan Route
    name: String,
    icon: String,
    color: String,
    frequency: String,
    streak: { type: Number, default: 0 },
    lastChecked: Date,
  })
);
