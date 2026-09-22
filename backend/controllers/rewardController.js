// controllers/rewardController.js
const Reward   = require('../models/Reward')
const User     = require('../models/User')
const Points   = require('../models/Points')
const AuditLog = require('../models/AuditLog')

// GET /api/rewards
const getRewards = async (req, res) => {
  try {
    const rewards = await Reward.find({ isActive:true }).sort({ pointsRequired:1 })
    res.json({ rewards })
  } catch (e) { res.status(500).json({ message:e.message }) }
}

// POST /api/rewards  (SK only)
const createReward = async (req, res) => {
  try {
    const { title, description, pointsRequired, image, stock } = req.body
    if (!title || !pointsRequired) return res.status(400).json({ message:'Title and points required.' })
    const reward = await Reward.create({
      title, description, pointsRequired, image: image||'', stock: stock ?? -1,
      createdBy: req.user._id,
    })
    await AuditLog.create({ user:req.user._id, action:'CREATE_REWARD', details:`${req.user.firstName} created reward: ${title} (${pointsRequired} pts)` })
    res.status(201).json({ message:'Reward created.', reward })
  } catch (e) { res.status(500).json({ message:e.message }) }
}

// PUT /api/rewards/:id
const updateReward = async (req, res) => {
  try {
    const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, { new:true })
    if (!reward) return res.status(404).json({ message:'Reward not found.' })
    await AuditLog.create({ user:req.user._id, action:'UPDATE_REWARD', details:`${req.user.firstName} updated reward: ${reward.title}` })
    res.json({ message:'Reward updated.', reward })
  } catch (e) { res.status(500).json({ message:e.message }) }
}

// DELETE /api/rewards/:id  (soft delete)
const deleteReward = async (req, res) => {
  try {
    const reward = await Reward.findByIdAndUpdate(req.params.id, { isActive:false }, { new:true })
    if (!reward) return res.status(404).json({ message:'Reward not found.' })
    await AuditLog.create({ user:req.user._id, action:'DELETE_REWARD', details:`${req.user.firstName} removed reward: ${reward.title}` })
    res.json({ message:'Reward removed.' })
  } catch (e) { res.status(500).json({ message:e.message }) }
}

// POST /api/rewards/award-points  (SK manually awards points to a kabataan)
const awardPoints = async (req, res) => {
  try {
    const { userId, points, reason } = req.body
    if (!userId || !points || !reason) return res.status(400).json({ message:'User, points, and reason are required.' })
    if (points <= 0) return res.status(400).json({ message:'Points must be greater than 0.' })

    const kab = await User.findById(userId)
    if (!kab) return res.status(404).json({ message:'User not found.' })
    if (kab.role !== 'kabataan') return res.status(400).json({ message:'Points can only be awarded to kabataan members.' })

    await User.findByIdAndUpdate(userId, { $inc:{ points } })
    await Points.create({ user:userId, pointsEarned:points, type:'awarded', reason })

    await AuditLog.create({
      user:req.user._id, action:'AWARD_POINTS',
      details:`${req.user.firstName} ${req.user.lastName} awarded ${points} pts to ${kab.firstName} ${kab.lastName} — Reason: ${reason}`,
    })
    res.json({ message:`Awarded ${points} points to ${kab.firstName} ${kab.lastName}.` })
  } catch (e) { res.status(500).json({ message:e.message }) }
}

module.exports = { getRewards, createReward, updateReward, deleteReward, awardPoints }