const router = require("express").Router();
const Task = require("../models/Task");
const Habit = require("../models/Habit"); // Pastikan Model Habit ada
const Goal = require("../models/Goal"); // Pastikan Model Goal ada
const { sendEmail } = require("../utils/notify");

router.get("/execute-job-rahasia-x9z8", async (req, res) => {
  try {
    console.log("⏰ Running Comprehensive Reminder...");
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. CEK TASK DEADLINE (Besok)
    const tasks = await Task.find({
      completed: false,
      date: { $gte: now, $lte: tomorrow },
    }).populate("user", "email name");

    // 2. CEK HABITS (Belum dikerjakan hari ini)
    // Asumsi: Habit streak belum update hari ini
    // Logic sederhana: Reminder umum untuk cek habit
    const habits = await Habit.find({}).populate("user", "email name");

    // 3. CEK GOALS (Deadline dekat)
    const goals = await Goal.find({
      progress: { $lt: 100 },
      deadline: { $gte: now, $lte: tomorrow },
    }).populate("user", "email name");

    let emailCount = 0;

    // Kirim Email Task
    for (const task of tasks) {
      if (task.user?.email) {
        await sendEmail(task.user.email, "⚡ Focusly: Task Deadline!", `Hi ${task.user.name}, task <b>"${task.title}"</b> is due soon! Let's finish it.`);
        emailCount++;
      }
    }

    // Kirim Email Goal
    for (const goal of goals) {
      if (goal.user?.email) {
        await sendEmail(goal.user.email, "🎯 Focusly: Goal Deadline!", `Hi ${goal.user.name}, your goal <b>"${goal.title}"</b> is almost due. You are at ${Math.round(goal.progress)}%. Push it!`);
        emailCount++;
      }
    }

    // Kirim Motivasi Habit (Sampling Random User agar tidak spam setiap hari ke semua orang)
    // Atau kirim ke user yang punya habit tapi streak 0
    // Disini kita kirim motivasi general ke 5 user random sebagai contoh
    if (habits.length > 0) {
      const randomHabits = habits.sort(() => 0.5 - Math.random()).slice(0, 5);
      for (const h of randomHabits) {
        if (h.user?.email) {
          await sendEmail(h.user.email, "🔥 Keep the Streak!", `Hi ${h.user.name}, don't forget to check your habit <b>"${h.name}"</b> today. Consistency is key!`);
          emailCount++;
        }
      }
    }

    console.log(`✅ Reminder done. Sent ${emailCount} emails.`);
    res.json({ status: "ok", emailsSent: emailCount });
  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
