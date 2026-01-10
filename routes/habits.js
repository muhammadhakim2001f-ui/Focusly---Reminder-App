const router = require("express").Router();
const Habit = require("../models/Habit");
const auth = require("../middleware/auth");
const { notify, sendEmail } = require("../utils/notify");

// Get Habits (Pastikan menggunakan field 'user' yang konsisten dengan task)
router.get("/", auth, async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user.id });
    res.json(habits);
  } catch (e) {
    console.error("Get Habits Error:", e);
    res.status(500).json({ error: "Fetch Error" });
  }
});

// Create Habit
router.post("/", auth, async (req, res) => {
  try {
    // Kita gunakan 'user' sesuai konsistensi Task
    const h = await Habit.create({
      ...req.body,
      user: req.user.id,
      streak: 0,
      lastChecked: null,
    });
    res.status(201).json(h);
  } catch (e) {
    console.error("Create Habit Error:", e);
    res.status(500).json({ error: "Create Error" });
  }
});

// Check Habit
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
      try {
        await notify(req.user.id, "Habit Checked! 🔥", `Streak: ${h.streak} days on "${h.name}"`);
      } catch (err) {
        console.error("Notif Error", err);
      }
    }
    res.json(h);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Check failed" });
  }
});

module.exports = router;
