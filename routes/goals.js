const router = require("express").Router();
const Goal = require("../models/Goal");
const auth = require("../middleware/auth");
const { notify, sendEmail } = require("../utils/notify");

router.get("/", auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const newGoal = await Goal.create({ ...req.body, userId: req.user.id });
    res.status(201).json(newGoal);
  } catch (err) {
    res.status(500).json({ error: "Create Goal Failed" });
  }
});

router.post("/:id/milestone", auth, async (req, res) => {
  try {
    const g = await Goal.findById(req.params.id);
    g.milestones.push({ text: req.body.text, completed: false });
    const total = g.milestones.length;
    const done = g.milestones.filter((m) => m.completed).length;
    g.progress = total === 0 ? 0 : (done / total) * 100;
    await g.save();
    res.json(g);
  } catch (err) {
    res.status(500).json({ error: "Add Milestone Failed" });
  }
});

router.put("/:id/milestone/:idx", auth, async (req, res) => {
  try {
    const g = await Goal.findById(req.params.id);
    const idx = req.params.idx;
    const ms = g.milestones[idx];
    ms.completed = !ms.completed;

    const total = g.milestones.length;
    const done = g.milestones.filter((m) => m.completed).length;
    g.progress = total === 0 ? 0 : (done / total) * 100;
    await g.save();

    if (ms.completed) {
      await notify(req.user.id, "Milestone Done 🚩", `Completed: "${ms.text}" in "${g.title}"`);
      if (g.progress === 100) {
        const User = require("../models/User");
        const user = await User.findById(req.user.id);
        if (user && user.email) await sendEmail(user.email, "🎉 Goal Achieved!", `<h3>You did it!</h3><p>Goal <b>${g.title}</b> is 100% complete.</p>`);
      }
    }
    res.json(g);
  } catch (err) {
    res.status(500).json({ error: "Toggle Failed" });
  }
});

module.exports = router;
