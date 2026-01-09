const router = require("express").Router();
const Goal = require("../models/Goal");
const auth = require("../middleware/auth");

// 1. GET ALL GOALS
router.get("/", auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id });
    res.json(goals);
  } catch (err) {
    console.error("Fetch Goals Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

// 2. CREATE GOAL
router.post("/", auth, async (req, res) => {
  try {
    const newGoal = await Goal.create({ ...req.body, userId: req.user.id });
    res.status(201).json(newGoal);
  } catch (err) {
    console.error("Create Goal Error:", err);
    res.status(500).json({ error: "Create Goal Failed" });
  }
});

// 3. ADD MILESTONE (Endpoint Baru - Penting untuk poin 3 permintaan Anda)
router.post("/:id/milestone", auth, async (req, res) => {
  try {
    const g = await Goal.findById(req.params.id);
    if (!g) return res.status(404).json({ error: "Goal not found" });

    // Tambah milestone baru ke array
    g.milestones.push({ text: req.body.text, completed: false });

    // Hitung ulang progress
    const total = g.milestones.length;
    const done = g.milestones.filter((m) => m.completed).length;
    g.progress = total === 0 ? 0 : (done / total) * 100;

    await g.save();
    res.json(g); // Return data terbaru agar UI langsung update
  } catch (err) {
    console.error("Add Milestone Error:", err);
    res.status(500).json({ error: "Add Milestone Failed" });
  }
});

// 4. TOGGLE MILESTONE (Ceklis/Unceklis + Hitung Progress)
router.put("/:id/milestone/:idx", auth, async (req, res) => {
  try {
    const g = await Goal.findById(req.params.id);
    if (!g) return res.status(404).json({ error: "Goal not found" });

    const idx = req.params.idx;

    // Cek apakah index milestone valid
    if (g.milestones[idx]) {
      g.milestones[idx].completed = !g.milestones[idx].completed;

      // Hitung ulang progress otomatis
      const total = g.milestones.length;
      const done = g.milestones.filter((m) => m.completed).length;
      g.progress = total === 0 ? 0 : (done / total) * 100;

      await g.save();
      res.json(g);
    } else {
      res.status(404).json({ error: "Milestone not found" });
    }
  } catch (err) {
    console.error("Toggle Milestone Error:", err);
    res.status(500).json({ error: "Toggle Failed" });
  }
});

module.exports = router;
