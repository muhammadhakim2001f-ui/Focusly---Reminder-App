const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Project = require("../models/Project"); // Import Project
const { notify } = require("../utils/notify");

// --- REGISTER ---
router.post("/signup", async (req, res) => {
  try {
    const { name, password } = req.body;
    // Paksa email jadi lowercase
    const email = req.body.email.toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    // 1. Notifikasi Welcome Biasa
    notify(user._id, "Welcome", "Welcome to Focusly! Your productivity journey starts here.");

    // 2. LOGIKA BARU: Cek apakah email ini sudah diundang ke Project?
    const invitedProjects = await Project.find({ members: email });

    if (invitedProjects.length > 0) {
      invitedProjects.forEach((p) => {
        // Beri notifikasi in-app
        notify(user._id, "New Project", `You are already a member of project: ${p.name}`);
      });
    }

    res.json({ msg: "Account created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// --- LOGIN (Update sedikit untuk kirim email lowercase) ---
router.post("/login", async (req, res) => {
  try {
    const email = req.body.email.toLowerCase(); // Lowercase input login
    const password = req.body.password;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ user: { id: user.id, email: user.email } }, "secret", { expiresIn: "7d" }); // Tambah email di token payload
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ... (Sisa route exp tetap sama) ...
router.put("/exp", require("../middleware/auth"), async (req, res) => {
  // ... kode lama ...
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.exp += req.body.amount;
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update EXP" });
  }
});

module.exports = router;
