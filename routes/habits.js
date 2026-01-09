const router = require("express").Router();
const Habit = require("../models/Habit");
const auth = require("../middleware/auth");
const { notify, sendEmail } = require("../utils/notify");

router.get("/", auth, async (req, res) => res.json(await Habit.find({ user: req.user.id })));

router.post("/", auth, async (req, res) => {
  try {
    const h = await Habit.create({ ...req.body, user: req.user.id });
    res.json(h);
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

router.post("/:id/check", auth, async (req, res) => {
  try {
    const h = await Habit.findById(req.params.id);
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
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Check failed" });
  }
});

module.exports = router;
