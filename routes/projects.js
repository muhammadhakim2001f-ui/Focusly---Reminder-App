const router = require("express").Router();
const Project = require("../models/Project");
const User = require("../models/User"); // Import User agar tidak Crash
const auth = require("../middleware/auth");
const { sendEmail } = require("../utils/notify");

// 1. GET ALL PROJECTS (Menampilkan Project user & tim)
router.get("/", auth, async (req, res) => {
  try {
    let userEmail = req.user.email;

    // Fix Token Lama: Jika email di token kosong, ambil dari DB
    if (!userEmail) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      userEmail = user.email;
    }

    // Pastikan lowercase agar cocok dengan data invite
    userEmail = userEmail.toLowerCase();

    const projects = await Project.find({
      $or: [{ createdBy: req.user.id }, { members: userEmail }],
    });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error Fetching Projects" });
  }
});

// 2. CREATE PROJECT (Membuat Project Baru)
router.post("/", auth, async (req, res) => {
  try {
    // Logic Simpan ke Database (INI YANG TADI HILANG)
    await Project.create({
      ...req.body,
      createdBy: req.user.id,
      tasks: [], // Inisialisasi array tasks kosong
    });
    res.sendStatus(201);
  } catch (err) {
    console.error("Create Project Error:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// 3. INVITE MEMBER (Mengundang Teman)
router.post("/:id/invite", auth, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    const emailRaw = req.body.email;

    if (!emailRaw) return res.status(400).json({ error: "Email required" });

    const email = emailRaw.toLowerCase(); // Lowercase email

    if (!p.members.includes(email)) {
      p.members.push(email);
      await p.save();

      const link = process.env.BASE_URL || "http://localhost:5000";

      // Kirim Email (Pastikan notify.js sudah benar)
      await sendEmail(
        email,
        "Project Invitation",
        `
            <div style="text-align:center; font-family:sans-serif;">
                <h3>You have been invited!</h3>
                <p>User <b>${req.user.email || "A colleague"}</b> invited you to join project: <b>${p.name}</b>.</p>
                <a href="${link}" style="background:#6C63FF; color:white; padding:12px 24px; text-decoration:none; border-radius:5px; display:inline-block; margin-top:10px;">Open Focusly</a>
            </div>
        `
      );
    }
    res.sendStatus(200);
  } catch (e) {
    console.error("Invite Error:", e);
    res.status(500).json({ error: "Invite failed" });
  }
});

// 4. ADD TASK (Menambah Tugas ke Project)
router.post("/:id/task", auth, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });

    // Masukkan task baru ke array tasks
    p.tasks.push({
      title: req.body.title,
      assignee: req.body.assignee,
      deadline: req.body.deadline,
      completed: false,
    });

    await p.save();
    res.sendStatus(200);
  } catch (e) {
    console.error("Add Task Error:", e);
    res.status(500).json({ error: "Add task failed" });
  }
});

// ... import existing ...

// UPDATE: Toggle Project Task + NOTIFICATION
router.put("/:id/task/:idx", auth, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    if (!p) return res.status(404).json({ error: "Project not found" });

    // Toggle status
    const task = p.tasks[req.params.idx];
    task.completed = !task.completed;

    await p.save();

    // --- LOGIC NOTIFIKASI BARU (Poin 6) ---
    if (task.completed) {
      // Kirim email ke semua member KECUALI yang mengerjakan
      const doerEmail = req.user.email.toLowerCase();
      const otherMembers = p.members.filter((m) => m !== doerEmail);

      otherMembers.forEach(async (memberEmail) => {
        await sendEmail(
          memberEmail,
          `Project Update: ${p.name}`,
          `
                  <h3>Task Completed! ✅</h3>
                  <p><b>${req.user.email}</b> just completed task: <b>"${task.title}"</b> in project ${p.name}.</p>
                  <p>Great teamwork!</p>
                  <a href="${process.env.BASE_URL}">Check Project</a>
                  `
        );
        // Opsional: Buat notifikasi in-app juga (perlu logic insert ke DB Notification user lain)
      });
    }
    // -------------------------------------

    res.sendStatus(200);
  } catch (e) {
    console.error("Toggle Task Error:", e);
    res.status(500).json({ error: "Toggle task failed" });
  }
});

module.exports = router;
