const router = require('express').Router(); const Notif = require('../models/Notification'); const auth = require('../middleware/auth');
router.get('/', auth, async(req,res)=>res.json(await Notif.find({userId:req.user.id}).sort({createdAt:-1})));
router.put('/read', auth, async(req,res)=>{ await Notif.updateMany({userId:req.user.id}, {read:true}); res.sendStatus(200); });
module.exports=router;