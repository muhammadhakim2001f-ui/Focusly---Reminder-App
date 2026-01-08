const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const Goal = require('../models/Goal');
const Project = require('../models/Project');

// Habits
router.get('/habits', async (req, res) => { res.json(await Habit.find()); });
router.post('/habits', async (req, res) => { await Habit.create(req.body); res.sendStatus(201); });

// Goals
router.get('/goals', async (req, res) => { res.json(await Goal.find()); });

// Projects
router.get('/projects', async (req, res) => { res.json(await Project.find()); });

module.exports = router;