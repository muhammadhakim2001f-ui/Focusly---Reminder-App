const router = require("express").Router();
const Project = require("../models/Project");
const User = require("../models/User"); // <--- TAMBAHKAN INI (Import Model User)
const auth = require("../middleware/auth");
const { sendEmail } = require("../utils/notify");

router.get("/", auth, async (req, res) => {
  try {
    let userEmail = req.user.email;

    // --- ANTI CRASH: JIKA TOKEN LAMA (TIDAK ADA EMAIL), AMBIL DARI DB ---
    if (!userEmail) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      userEmail = user.email;
    }
    // --------------------------------------------------------------------

    // Sekarang aman untuk dilowercase
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

// ... (Sisa kode router.post dll biarkan tetap sama) ...
router.post("/", auth, async (req, res) => {
  // ...
  res.sendStatus(201);
});
// ... dst
module.exports = router;
