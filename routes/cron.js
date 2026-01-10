const router = require("express").Router();
const Task = require("../models/Task");
const Habit = require("../models/Habit");
const Goal = require("../models/Goal");
const Project = require("../models/Project"); // Import Project untuk Team Task
const User = require("../models/User");
const { sendEmail, notify } = require("../utils/notify");

router.get("/execute-job-rahasia-x9z8", async (req, res) => {
  try {
    console.log("⏰ Running Smart Reminder System...");
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let emailCount = 0;

    // --- 1. CEK PERSONAL TASK (Deadline Besok & Overdue) ---
    // Cari tugas yang belum selesai
    const tasks = await Task.find({ completed: false }).populate("user");

    for (const task of tasks) {
      if (task.user && task.user.email && task.date) {
        const taskDate = new Date(task.date);

        // KONDISI A: Deadline Besok (Hampir Habis)
        if (taskDate >= now && taskDate <= tomorrow) {
          await sendEmail(task.user.email, "⚡ Reminder: Task Deadline", `Hi ${task.user.name}, task <b>"${task.title}"</b> is due soon!`);
          await notify(task.user._id, "Task Deadline ⏰", `"${task.title}" is due tomorrow!`);
          emailCount++;
        }
        // KONDISI B: Overdue (Sudah Lewat & Belum Selesai)
        else if (taskDate < now) {
          await sendEmail(task.user.email, "⚠️ Overdue Task Alert", `Hi ${task.user.name}, task <b>"${task.title}"</b> is OVERDUE! Please finish it.`);
          await notify(task.user._id, "Task Overdue ⚠️", `"${task.title}" is late!`);
          emailCount++;
        }
      }
    }

    // --- 2. CEK TEAM PROJECT TASK (Algoritma Baru) ---
    // Cari semua project
    const projects = await Project.find({});

    for (const p of projects) {
      // Filter task yang belum selesai
      const activeTasks = p.tasks.filter((t) => !t.completed && t.assignee && t.deadline);

      for (const t of activeTasks) {
        const tDate = new Date(t.deadline);
        // Cari User berdasarkan email assignee
        const assigneeUser = await User.findOne({ email: t.assignee.toLowerCase() });

        if (assigneeUser) {
          // Cek Deadline / Overdue untuk Team Task
          if (tDate < now) {
            // Telat
            await sendEmail(assigneeUser.email, `⚠️ Team Task Overdue: ${p.name}`, `Task <b>"${t.title}"</b> in project ${p.name} is late.`);
            await notify(assigneeUser._id, "Team Task Late ⚠️", `Task "${t.title}" in ${p.name} is overdue.`);
            emailCount++;
          } else if (tDate <= tomorrow) {
            // Besok
            await sendEmail(assigneeUser.email, `⚡ Team Task Deadline: ${p.name}`, `Task <b>"${t.title}"</b> in project ${p.name} is due soon.`);
            await notify(assigneeUser._id, "Team Task Deadline ⏰", `Task "${t.title}" in ${p.name} due soon.`);
            emailCount++;
          }
        }
      }
    }

    // --- 3. CEK GOALS (Motivasi Progress) ---
    const goals = await Goal.find({ progress: { $lt: 100 }, deadline: { $gte: now, $lte: tomorrow } });
    for (const goal of goals) {
      const user = await User.findById(goal.userId);
      if (user && user.email) {
        await sendEmail(user.email, "🎯 Goal Deadline!", `Hi ${user.name}, goal <b>"${goal.title}"</b> is almost due. Current progress: ${Math.round(goal.progress)}%`);
        await notify(user._id, "Goal Deadline 🎯", `Goal "${goal.title}" deadline is near!`);
        emailCount++;
      }
    }

    // --- 4. CEK HABITS (Motivasi Harian) ---
    // Kirim ke habit yang belum dikerjakan hari ini (Random Sampling)
    const habits = await Habit.find({});
    const todayStr = new Date().toDateString();

    for (const h of habits) {
      const lastCheck = h.lastChecked ? new Date(h.lastChecked).toDateString() : "";
      // Jika belum dikerjakan hari ini DAN (probabilitas 30% ATAU streak > 3 hari biar tidak putus)
      if (lastCheck !== todayStr && (Math.random() > 0.7 || h.streak > 3)) {
        const user = await User.findById(h.user); // Pakai 'user' (sesuai skema terakhir)
        if (user && user.email) {
          await sendEmail(user.email, "🔥 Keep the Streak!", `Hi ${user.name}, don't break your ${h.streak}-day streak on <b>"${h.name}"</b>!`);
          await notify(user._id, "Habit Reminder 🔥", `Don't forget "${h.name}" today!`);
          emailCount++;
        }
      }
    }

    console.log(`✅ Smart Reminder Finished. Sent ${emailCount} notifications.`);
    res.json({ status: "ok", emailsSent: emailCount });
  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
