const router = require('express').Router(); const Goal = require('../models/Goal'); const auth = require('../middleware/auth');
router.get('/', auth, async(req,res)=>res.json(await Goal.find({userId:req.user.id})));
router.post('/', auth, async(req,res)=>{ await Goal.create({...req.body, userId:req.user.id}); res.sendStatus(201); });
router.put('/:id/milestone/:idx', auth, async(req,res)=>{ 
    const g=await Goal.findById(req.params.id); g.milestones[req.params.idx].completed = !g.milestones[req.params.idx].completed;
    g.progress = (g.milestones.filter(m=>m.completed).length / g.milestones.length) * 100;
    await g.save(); res.sendStatus(200); 
});
module.exports=router;