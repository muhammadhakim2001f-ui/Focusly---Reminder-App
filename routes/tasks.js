const router = require('express').Router(); const Task = require('../models/Task'); const auth = require('../middleware/auth'); const multer = require('multer');
const upload = multer({storage:multer.diskStorage({destination:'./uploads/',filename:(r,f,c)=>c(null,Date.now()+require('path').extname(f.originalname))})});
router.get('/', auth, async(req,res)=>res.json(await Task.find({user:req.user.id})));
router.post('/', [auth, upload.fields([{name:'voice'},{name:'image'}])], async(req,res)=>{
    const t = await Task.create({ ...req.body, user:req.user.id, voiceNoteUrl:req.files.voice? '/uploads/'+req.files.voice[0].filename:null, imageUrl:req.files.image? '/uploads/'+req.files.image[0].filename:null });
    res.json(t);
});
router.put('/:id', auth, async(req,res)=>{ await Task.findByIdAndUpdate(req.params.id, req.body); res.sendStatus(200); });
module.exports=router;