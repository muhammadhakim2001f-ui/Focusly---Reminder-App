const router = require("express").Router();
const Task = require("../models/Task");
const Habit = require("../models/Habit");
const Goal = require("../models/Goal");
const { sendEmail } = require("../utils/notify");

router.get("/execute-job-rahasia-x9z8", async (req, res) => {
  try {
    console.log("⏰ Running Smart Reminder...");
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await Task.find({ completed: false, date: { $gte: now, $lte: tomorrow } }).populate("user", "email name");
    const habits = await Habit.find({}).populate("user", "email name");
    const goals = await Goal.find({ progress: { $lt: 100 }, deadline: { $gte: now, $lte: tomorrow } }).populate("user", "email name");

    let emailCount = 0;

    for (const task of tasks) {
      if (task.user?.email) {
        await sendEmail(task.user.email, "⚡ Task Deadline!", `Hi ${task.user.name}, task <b>"${task.title}"</b> is due soon!`);
        emailCount++;
      }
    }

    for (const goal of goals) {
      if (goal.user?.email) {
        await sendEmail(goal.user.email, "🎯 Goal Deadline!", `Hi ${goal.user.name}, goal <b>"${goal.title}"</b> is almost due.`);
        emailCount++;
      }
    }

    if (habits.length > 0) {
      const randomHabits = habits.sort(() => 0.5 - Math.random()).slice(0, 5);
      for (const h of randomHabits) {
        if (h.user?.email) {
          await sendEmail(h.user.email, "🔥 Keep the Streak!", `Hi ${h.user.name}, check your habit <b>"${h.name}"</b> today!`);
          emailCount++;
        }
      }
    }

    console.log(`✅ Sent ${emailCount} reminders.`);
    res.json({ status: "ok", emailsSent: emailCount });
  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
