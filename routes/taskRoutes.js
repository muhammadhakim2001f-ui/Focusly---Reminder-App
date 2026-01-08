const express = require('express'); const router = express.Router(); const Task = require('../models/Task'); const auth = require('../middleware/authMiddleware'); const multer = require('multer'); const path = require('path');
const storage = multer.diskStorage({ destination: './uploads/', filename: (req,f,cb)=>cb(null, Date.now()+path.extname(f.originalname)) });
const upload = multer({storage});

router.get('/', auth, async(req,res)=> res.json(await Task.find({user:req.user.id}).sort({date:1})));
router.post('/', [auth, upload.fields([{name:'image'},{name:'voice'}])], async(req,res)=>{
    const task = new Task({
        user: req.user.id,
        title: req.body.title,
        priority: req.body.priority,
        date: req.body.date,
        time: req.body.time, // HH:MM
        location: req.body.location,
        voiceNoteUrl: req.files?.voice ? '/uploads/'+req.files.voice[0].filename : null,
        imageUrl: req.files?.image ? '/uploads/'+req.files.image[0].filename : null
    });
    await task.save();
    res.json(task);
});
router.put('/:id', auth, async(req,res)=>{
    await Task.findByIdAndUpdate(req.params.id, req.body);
    res.sendStatus(200);
});
module.exports = router;