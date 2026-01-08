// routes/projects.js
const router = require("express").Router();
const Project = require("../models/Project");
const auth = require("../middleware/auth");
const { sendEmail } = require("../utils/notify"); // Import fungsi email baru

router.get("/", auth, async (req, res) => res.json(await Project.find({ $or: [{ createdBy: req.user.id }, { members: req.user.email }] })));

router.post("/", auth, async (req, res) => {
  await Project.create({ ...req.body, createdBy: req.user.id });
  res.sendStatus(201);
});

// REVISI: Invite Member dengan Email Asli
router.post("/:id/invite", auth, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    const email = req.body.email;

    if (!p.members.includes(email)) {
      p.members.push(email);
      await p.save();

      // Kirim Email Undangan
      await sendEmail(
        email,
        "Project Invitation",
        `
                <h3>You have been invited!</h3>
                <p>User <b>${req.user.email}</b> invited you to join project: <b>${p.name}</b>.</p>
                <a href="http://localhost:5000" style="background:#6C63FF; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Open Focusly</a>
            `
      );
    }
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Invite failed" });
  }
});

router.post("/:id/task", auth, async (req, res) => {
  const p = await Project.findById(req.params.id);
  p.tasks.push(req.body);
  await p.save();
  res.sendStatus(200);
});
router.put("/:id/task/:idx", auth, async (req, res) => {
  const p = await Project.findById(req.params.id);
  p.tasks[req.params.idx].completed = !p.tasks[req.params.idx].completed;
  await p.save();
  res.sendStatus(200);
});

module.exports = router;
