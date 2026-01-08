const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { notify } = require("../utils/notify");

// --- REGISTER ---
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Cek apakah email sudah ada
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // 2. Hash Password & Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    // 3. Notifikasi (Non-blocking: jika gagal email, user tetap terdaftar)
    try {
      await notify(user._id, "Welcome", "Welcome to Focusly! Your productivity journey starts here.");
    } catch (err) {
      console.error("Email notification failed:", err.message);
    }

    res.json({ msg: "Account created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    // Cek user & password
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate Token
    const token = jwt.sign({ user: { id: user.id } }, "secret", { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// --- UPDATE EXP ---
router.put("/exp", require("../middleware/auth"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.exp += req.body.amount;
    await user.save();

    // Notifikasi EXP (Opsional, agar tidak spam email bisa dikomentari)
    // notify(user._id, 'EXP Gained', `Gained ${req.body.amount} EXP`);

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update EXP" });
  }
});

module.exports = router;
