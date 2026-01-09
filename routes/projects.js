const router = require("express").Router();
const Project = require("../models/Project");
const User = require("../models/User"); // Wajib ada untuk cari ID member lain
const auth = require("../middleware/auth");
const { sendEmail, notify } = require("../utils/notify");

// GET
router.get("/", auth, async (req, res) => {
  try {
    let userEmail = req.user.email;
    if (!userEmail) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      userEmail = user.email;
    }
    userEmail = userEmail.toLowerCase();
    const projects = await Project.find({
      $or: [{ createdBy: req.user.id }, { members: userEmail }],
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// POST
router.post("/", auth, async (req, res) => {
  try {
    await Project.create({ ...req.body, createdBy: req.user.id, tasks: [] });
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// INVITE
router.post("/:id/invite", auth, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    const emailRaw = req.body.email;
    if (!emailRaw) return res.status(400).json({ error: "Email required" });
    const email = emailRaw.toLowerCase();

    if (!p.members.includes(email)) {
      p.members.push(email);
      await p.save();
      const link = process.env.BASE_URL || "http://localhost:5000";
      await sendEmail(email, "Project Invitation", `User ${req.user.email} invited you to join ${p.name}. <a href="${link}">Open</a>`);

      // Notify Member (Web)
      const targetUser = await User.findOne({ email: email });
      if (targetUser) {
        await notify(targetUser._id, "Project Invitation 🤝", `You have been invited to project "${p.name}"`);
      }
    }
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: "Invite failed" });
  }
});

// ADD TASK
router.post("/:id/task", auth, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    p.tasks.push({ title: req.body.title, assignee: req.body.assignee, deadline: req.body.deadline, completed: false });
    await p.save();

    // Notify Assignee (Jika ada)
    if (req.body.assignee) {
      const assigneeEmail = req.body.assignee.toLowerCase();
      const targetUser = await User.findOne({ email: assigneeEmail });
      if (targetUser && targetUser._id.toString() !== req.user.id) {
        await notify(targetUser._id, "New Task Assigned 📋", `You have a new task: "${req.body.title}" in ${p.name}`);
      }
    }
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: "Add task failed" });
  }
});

// TOGGLE TASK (FIX NOTIFICATION HERE)
router.put("/:id/task/:idx", auth, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    const task = p.tasks[req.params.idx];
    task.completed = !task.completed;
    await p.save();

    // --- FIX WEB NOTIFICATION LOGIC ---
    if (task.completed) {
      const currentUserEmail = req.user.email.toLowerCase();

      // Filter member lain (selain diri sendiri)
      const otherMembers = p.members.filter((m) => m !== currentUserEmail);

      // Jika owner project bukan diri sendiri, tambahkan owner ke list notifikasi juga (opsional, tapi bagus)
      // (Skip logika owner complex, fokus ke members array dulu)

      // Loop untuk kirim notifikasi
      for (const memberEmail of otherMembers) {
        // 1. Kirim Email
        await sendEmail(memberEmail, `Project Update: ${p.name}`, `Task "${task.title}" completed by ${req.user.email}.`);

        // 2. Kirim Web Notif (Cari User ID dulu)
        const targetUser = await User.findOne({ email: memberEmail });
        if (targetUser) {
          await notify(targetUser._id, "Project Task Done ✅", `"${task.title}" completed by ${currentUserEmail.split("@")[0]}`);
        }
      }
    }
    // ----------------------------------
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Toggle task failed" });
  }
});

module.exports = router;
