const express = require('express'); const router = express.Router(); const Goal = require('../models/Goal'); const auth = require('../middleware/authMiddleware');
router.get('/', auth, async(req,res)=> res.json(await Goal.find({userId:req.user.id})));
router.post('/', auth, async(req,res)=> { await Goal.create({...req.body, userId:req.user.id}); res.sendStatus(201); });
module.exports = router;