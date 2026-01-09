const router = require("express").Router();
const Project = require("../models/Project");
const auth = require("../middleware/auth");
const { sendEmail, notify } = require("../utils/notify");

// Get Projects (Pastikan email dilowercase saat dicocokkan)
router.get("/", auth, async (req, res) => {
  // Cari project dimana user adalah PEMBUAT atau ANGGOTA
  const userEmail = req.user.email.toLowerCase();
  const projects = await Project.find({
    $or: [{ createdBy: req.user.id }, { members: userEmail }],
  });
  res.json(projects);
});

router.post("/", auth, async (req, res) => {
  // Member pertama (pembuat) juga disimpan lowercase
  await Project.create({
    ...req.body,
    createdBy: req.user.id,
  });
  res.sendStatus(201);
});

// REVISI: Invite Member (Fix Link & Logic)
router.post("/:id/invite", auth, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    const emailRaw = req.body.email;

    if (!emailRaw) return res.status(400).json({ error: "Email required" });

    const email = emailRaw.toLowerCase(); // WAJIB LOWERCASE

    if (!p.members.includes(email)) {
      p.members.push(email);
      await p.save();

      // Gunakan ENV untuk Link
      const link = process.env.BASE_URL || "http://localhost:5000";

      // Kirim Email Undangan
      await sendEmail(
        email,
        "Project Invitation",
        `
            <div style="text-align:center; font-family:sans-serif;">
                <h3>You have been invited!</h3>
                <p>User <b>${req.user.email}</b> invited you to join project: <b>${p.name}</b>.</p>
                <p>Click the button below to accept and start collaborating.</p>
                <a href="${link}" style="background:#6C63FF; color:white; padding:12px 24px; text-decoration:none; border-radius:5px; display:inline-block; margin-top:10px;">Open Focusly</a>
                <p style="font-size:0.8rem; color:gray; margin-top:20px">If you don't have an account, please Register with this email address.</p>
            </div>
        `
      );
    }
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Invite failed" });
  }
});

// ... (Sisa rute task tetap sama, tidak perlu diubah) ...
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
