// pointsController.js
const Points = require('../models/Points')
const User   = require('../models/User')

// @GET /api/points/my — sum from Points collection (source of truth)
// Also syncs User.points so the balance is always accurate
const getMyPoints = async (req, res) => {
  try {
    // Sum all earned points from Points collection
    const earned = await Points.aggregate([
      { $match: { user: req.user._id, type: { $in: ['earned', 'awarded'] } } },
      { $group: { _id: null, total: { $sum: '$pointsEarned' } } },
    ])
    const redeemed = await Points.aggregate([
      { $match: { user: req.user._id, type: 'redeemed' } },
      { $group: { _id: null, total: { $sum: '$pointsEarned' } } },
    ])
    const balance = (earned[0]?.total || 0) - (redeemed[0]?.total || 0)

    // Keep User.points in sync
    await User.findByIdAndUpdate(req.user._id, { points: balance })

    res.json({ balance })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/points/history — earning records from Points collection
const getHistory = async (req, res) => {
  try {
    const history = await Points
      .find({ user: req.user._id })
      .populate('meeting', 'title type date')
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({ history })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/points/leaderboard — top kabataan by points
const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User
      .find({ role: 'kabataan_user', isActive: true })
      .select('firstName lastName points municipality barangay')
      .sort({ points: -1 })
      .limit(20)
    res.json({ leaderboard })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/points/award — SK Officer manually awards points
const awardPoints = async (req, res) => {
  try {
    const { userId, points, reason } = req.body
    if (!userId || !points) return res.status(400).json({ message: 'userId and points required.' })

    await User.findByIdAndUpdate(userId, { $inc: { points } })
    await Points.create({
      user:         userId,
      pointsEarned: points,
      type:         'awarded',
      reason:       reason || 'Points awarded by SK Officer',
      checkedInAt:  new Date(),
    })
    res.json({ message: `Awarded ${points} points.` })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getMyPoints, getHistory, getLeaderboard, awardPoints }