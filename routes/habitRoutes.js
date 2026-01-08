const express = require('express'); const router = express.Router(); const Habit = require('../models/Habit'); const auth = require('../middleware/authMiddleware');
router.get('/', auth, async(req,res)=> res.json(await Habit.find({userId:req.user.id})));
router.post('/', auth, async(req,res)=> { await Habit.create({...req.body, userId:req.user.id}); res.sendStatus(201); });
router.post('/:id/check', auth, async(req,res)=> {
    const h = await Habit.findById(req.params.id);
    h.streak += 1; h.lastChecked = new Date();
    await h.save(); res.json(h);
});
module.exports = router;