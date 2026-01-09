const router = require("express").Router();
const Habit = require("../models/Habit");
const auth = require("../middleware/auth");
const { notify, sendEmail } = require("../utils/notify");

// PENTING: Menggunakan 'userId' agar konsisten dengan Goals
router.get("/", auth, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id });
    res.json(habits);
  } catch (e) {
    res.status(500).json({ error: "Fetch Error" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const h = await Habit.create({
      ...req.body,
      userId: req.user.id, // GANTI DARI 'user' KE 'userId'
      streak: 0,
      lastChecked: null,
    });
    res.status(201).json(h);
  } catch (e) {
    console.error("Create Habit Error:", e);
    res.status(500).json({ error: "Create Error" });
  }
});

router.post("/:id/check", auth, async (req, res) => {
  try {
    const h = await Habit.findById(req.params.id);
    if (!h) return res.status(404).json({ error: "Not found" });

    const today = new Date().toDateString();
    const lastUpdate = h.lastChecked ? new Date(h.lastChecked).toDateString() : null;

    if (today !== lastUpdate) {
      h.streak++;
      h.lastChecked = new Date();
      await h.save();

      // Web Notif
      await notify(req.user.id, "Habit Checked! 🔥", `Streak: ${h.streak} days on "${h.name}"`);

      // Email Milestone
      if ([7, 30, 100].includes(h.streak)) {
        const User = require("../models/User");
        const user = await User.findById(req.user.id);
        if (user && user.email) {
          await sendEmail(user.email, "🔥 Habit Streak on Fire!", `<h3>You reached a ${h.streak}-day streak on ${h.name}!</h3>`);
        }
      }
    }
    res.json(h);
  } catch (e) {
    res.status(500).json({ error: "Check failed" });
  }
});

module.exports = router;
