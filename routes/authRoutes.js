const express = require('express'); const router = express.Router(); const bcrypt = require('bcryptjs'); const jwt = require('jsonwebtoken'); const User = require('../models/User'); const auth = require('../middleware/authMiddleware');
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    const token = jwt.sign({ user: { id: user.id, email: user.email } }, 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, exp: 0 } });
});
router.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ user: { id: user.id, email: user.email } }, 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, exp: user.exp, streak: user.streak } });
});
router.put('/exp', auth, async(req, res) => {
    const user = await User.findById(req.user.id);
    user.exp += req.body.amount;
    await user.save();
    res.json(user);
});
module.exports = router;