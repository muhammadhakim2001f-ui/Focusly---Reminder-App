const router = require("express").Router();
const Task = require("../models/Task");
const Habit = require("../models/Habit");
const Goal = require("../models/Goal");
const User = require("../models/User"); // Import User Model
const { sendEmail, notify } = require("../utils/notify"); // Import Web Notify

router.get("/execute-job-rahasia-x9z8", async (req, res) => {
  try {
    console.log("⏰ Running Reminder...");
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch Data
    const tasks = await Task.find({ completed: false, date: { $gte: now, $lte: tomorrow } }).populate("user");
    const habits = await Habit.find({}); // Ambil semua habit
    const goals = await Goal.find({ progress: { $lt: 100 }, deadline: { $gte: now, $lte: tomorrow } }); // Goals biasanya pakai userId, perlu populate manual

    let count = 0;

    // 1. Task Reminders
    for (const task of tasks) {
      if (task.user && task.user.email) {
        // Email
        await sendEmail(task.user.email, "⚡ Task Deadline!", `Hi ${task.user.name}, "${task.title}" is due soon!`);
        // Web Notif
        await notify(task.user._id, "Task Deadline ⏰", `"${task.title}" is due tomorrow!`);
        count++;
      }
    }

    // 2. Goal Reminders
    for (const goal of goals) {
      // Karena Goal pakai userId, kita cari usernya dulu
      const user = await User.findById(goal.userId);
      if (user && user.email) {
        await sendEmail(user.email, "🎯 Goal Deadline!", `Goal "${goal.title}" is almost due. Keep pushing!`);
        await notify(user._id, "Goal Deadline 🎯", `Goal "${goal.title}" deadline is near!`);
        count++;
      }
    }

    // 3. Habit Reminders (Random Sampling agar tidak spam masif)
    if (habits.length > 0) {
      // Kita ambil habit yang belum dicek hari ini
      const today = new Date().toDateString();

      for (const h of habits) {
        // Cek apakah habit milik user valid & belum dicek hari ini
        const lastCheck = h.lastChecked ? new Date(h.lastChecked).toDateString() : "";

        if (lastCheck !== today && Math.random() > 0.7) {
          // 30% chance diingatkan (biar variatif)
          const user = await User.findById(h.userId); // Pakai userId sesuai fix di routes/habits.js
          if (user && user.email) {
            await sendEmail(user.email, "🔥 Don't break the streak!", `Have you done "${h.name}" today?`);
            await notify(user._id, "Habit Reminder 🔥", `Don't forget "${h.name}" today!`);
            count++;
          }
        }
      }
    }

    console.log(`✅ Sent ${count} reminders.`);
    res.json({ status: "ok", emailsSent: count });
  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
