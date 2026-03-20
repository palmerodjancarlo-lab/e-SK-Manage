const Points = require('../models/Points')
const User   = require('../models/User')

// @GET /api/points/my — Get my points history
const getMyPoints = async (req, res) => {
  try {
    const history = await Points
      .find({ user: req.user._id })
      .sort({ createdAt: -1 })

    const user = await User.findById(req.user._id).select('points')
    res.json({ balance: user.points, history })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/points/leaderboard — Get top users
const getLeaderboard = async (req, res) => {
  try {
    const users = await User
      .find({ isActive: true })
      .select('firstName lastName points municipality barangay photo')
      .sort({ points: -1 })
      .limit(20)
    res.json({ leaderboard: users })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/points/award — Award points (admin/officer only)
const awardPoints = async (req, res) => {
  try {
    const { userId, points, reason } = req.body

    await Points.create({
      user:   userId,
      points,
      type:   'earned',
      reason
    })

    await User.findByIdAndUpdate(userId, {
      $inc: { points }
    })

    res.json({ message: `${points} points awarded successfully` })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/points/redeem — Redeem points
const redeemPoints = async (req, res) => {
  try {
    const { points, reason } = req.body
    const user = await User.findById(req.user._id)

    if (user.points < points) {
      return res.status(400).json({ message: 'Insufficient points' })
    }

    await Points.create({
      user:   req.user._id,
      points: -points,
      type:   'redeemed',
      reason
    })

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { points: -points }
    })

    res.json({ message: 'Points redeemed successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getMyPoints, getLeaderboard, awardPoints, redeemPoints }