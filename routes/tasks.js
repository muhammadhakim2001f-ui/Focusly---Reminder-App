const router = require("express").Router();
const Task = require("../models/Task");
const auth = require("../middleware/auth");
const multer = require("multer");

// Simpan di RAM agar Vercel tidak error "Read-only file system"
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/", auth, async (req, res) => res.json(await Task.find({ user: req.user.id })));

router.post("/", [auth, upload.fields([{ name: "voice" }, { name: "image" }])], async (req, res) => {
  try {
    // Vercel Free Tier tidak bisa menyimpan file fisik.
    // Kita simpan null agar database tidak kotor dengan link palsu.
    // Jika user memaksa upload, backend tidak akan error, tapi file tidak tersimpan.

    const t = await Task.create({
      ...req.body,
      user: req.user.id,
      voiceNoteUrl: null, // Fitur ini butuh Cloudinary (nanti kita bahas)
      imageUrl: null, // Fitur ini butuh Cloudinary
    });
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    await Task.findByIdAndUpdate(req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

module.exports = router;
