const express = require('express'); const router = express.Router(); const Project = require('../models/Project'); const auth = require('../middleware/authMiddleware'); const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email', port: 587, auth: { user: 'ethereal.user@ethereal.email', pass: 'pass' }
}); // Ganti dengan GMAIL di Production

router.get('/', auth, async(req,res)=> res.json(await Project.find({ $or: [{createdBy:req.user.id}, {members: req.user.email}] })));
router.post('/', auth, async(req,res)=> { 
    await Project.create({...req.body, createdBy:req.user.id, members:[req.user.email]}); 
    res.sendStatus(201); 
});

router.post('/:id/invite', auth, async(req,res)=> {
    const p = await Project.findById(req.params.id);
    p.members.push(req.body.email);
    await p.save();
    
    // Send Email
    // transporter.sendMail({ from: 'focusly@app.com', to: req.body.email, subject: 'Project Invite', text: 'You are invited to ' + p.name });
    
    res.json({msg: 'Invite Sent'});
});
module.exports = router;