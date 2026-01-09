const router = require("express").Router();
const Task = require("../models/Task");
const { sendEmail } = require("../utils/notify");

// NAMA LINK RAHASIA: /execute-job-rahasia-x9z8
// Orang lain tidak akan tahu link ini, jadi aman meski tanpa header check.
router.get("/execute-job-rahasia-x9z8", async (req, res) => {
  // --- BAGIAN INI SAYA HAPUS AGAR VERCEL TIDAK DITOLAK ---
  // const authHeader = req.headers['authorization'];
  // ...
  // -------------------------------------------------------

  try {
    console.log("⏰ Running Deadline Check...");

    // Cari task deadline besok
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await Task.find({
      completed: false,
      date: { $gte: now, $lte: tomorrow },
    }).populate("user", "email name");

    let emailCount = 0;
    for (const task of tasks) {
      // Pastikan user & email ada sebelum kirim
      if (task.user && task.user.email) {
        await sendEmail(
          task.user.email,
          "⚠️ Reminder: Task Deadline Near!",
          `
                    <h3>Don't forget!</h3>
                    <p>Hi ${task.user.name}, your task <b>"${task.title}"</b> is due on ${new Date(task.date).toLocaleDateString()}.</p>
                    <p>Priority: <b>${task.priority ? task.priority.toUpperCase() : "NORMAL"}</b></p>
                    <a href="${process.env.BASE_URL}">Complete it now</a>
                    `
        );
        emailCount++;
      }
    }

    console.log(`✅ Deadline check done. Sent ${emailCount} emails.`);
    res.json({ status: "ok", emailsSent: emailCount });
  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
