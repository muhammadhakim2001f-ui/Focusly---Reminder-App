const express = require('express'); const router = express.Router(); const Notification = require('../models/Notification'); const auth = require('../middleware/authMiddleware');
router.get('/', auth, async(req,res)=> res.json(await Notification.find({userId:req.user.id}).sort({createdAt:-1})));
module.exports = router;