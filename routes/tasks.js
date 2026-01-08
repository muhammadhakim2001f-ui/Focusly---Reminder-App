const router = require("express").Router();
const Task = require("../models/Task");
const auth = require("../middleware/auth");
const multer = require("multer");

// --- PERBAIKAN VERCEL ---
// Menggunakan memoryStorage (RAM) bukan diskStorage (Harddisk)
// Vercel tidak mengizinkan pembuatan file/folder baru (mkdir).
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/", auth, async (req, res) => res.json(await Task.find({ user: req.user.id })));

router.post("/", [auth, upload.fields([{ name: "voice" }, { name: "image" }])], async (req, res) => {
  try {
    // Logika disesuaikan: Karena di Vercel file tidak bisa disimpan permanen (tanpa Cloudinary),
    // kita set URL-nya jadi null atau dummy string agar tidak error "filename of undefined".
    const t = await Task.create({
      ...req.body,
      user: req.user.id,
      voiceNoteUrl: req.files && req.files.voice ? "voice_uploaded_memory" : null,
      imageUrl: req.files && req.files.image ? "image_uploaded_memory" : null,
    });
    res.json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id", auth, async (req, res) => {
  await Task.findByIdAndUpdate(req.params.id, req.body);
  res.sendStatus(200);
});

module.exports = router;
