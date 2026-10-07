// pointsController.js
const Points = require('../models/Points')
const User   = require('../models/User')
const { computePriorityPoints } = require('../config/pointsPolicy')

// @GET /api/points/my — sum from Points collection (source of truth)
// Also syncs User.points so the balance is always accurate
const getMyPoints = async (req, res) => {
  try {
    const earned = await Points.aggregate([
      { $match: { user: req.user._id, type: { $in: ['earned', 'awarded'] } } },
      { $group: { _id: null, total: { $sum: '$pointsEarned' } } },
    ])
    const redeemed = await Points.aggregate([
      { $match: { user: req.user._id, type: 'redeemed' } },
      { $group: { _id: null, total: { $sum: '$pointsEarned' } } },
    ])
    const balance = (earned[0]?.total || 0) - (redeemed[0]?.total || 0)

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
      .populate('activity', 'title type')
      .sort({ createdAt: -1 })
      .limit(50)
    res.json({ history })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const MIN_LEADERBOARD_POINTS = 5  // Only show kabataan with at least this many points

// @GET /api/points/leaderboard — top kabataan by points
const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User
      .find({ role: 'kabataan', isActive: true, idVerified: true, points: { $gte: MIN_LEADERBOARD_POINTS } })
      .select('firstName lastName points municipality barangay')
      .sort({ points: -1 })
      .limit(20)
    res.json({ leaderboard })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/points/award — SK Officer manually awards points
// Body: { userId, points, reason, applyPriority = true }
// applyPriority=false gives the exact flat amount (no bonus).
const awardPoints = async (req, res) => {
  try {
    const { userId, points, reason, applyPriority = true } = req.body
    if (!userId || !points) return res.status(400).json({ message: 'userId and points required.' })

    const kab = await User.findById(userId)
    if (!kab) return res.status(404).json({ message: 'User not found.' })

    let award = Number(points)
    let note = reason || 'Points awarded by SK Officer'

    if (applyPriority) {
      const r = computePriorityPoints(points, kab)
      award = r.finalPoints
      if (r.applied.length) note = `${note} — ${r.reason}`
    }

    await User.findByIdAndUpdate(userId, { $inc: { points: award } })
    await Points.create({
      user:         userId,
      pointsEarned: award,
      type:         'awarded',
      reason:       note,
      checkedInAt:  new Date(),
    })
    res.json({ message: `Awarded ${award} points.`, points: award })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/points/bulk-award
// Award points to multiple kabataan at once (attendance-based).
// Body: { userIds: [...], points, reason, applyPriority = true, meeting?, activity? }
const bulkAward = async (req, res) => {
  try {
    const { userIds, points, reason, applyPriority = true, meeting, activity } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message:'Select at least one kabataan.' })
    if (!points || points <= 0) return res.status(400).json({ message:'Points must be greater than 0.' })
    if (!reason) return res.status(400).json({ message:'A reason is required.' })

    const AuditLog = require('../models/AuditLog')

    // Only award to valid kabataan
    const kabs = await User.find({ _id:{ $in:userIds }, role:'kabataan' })
    let awarded = 0
    let totalPts = 0

    for (const k of kabs) {
      let award = Number(points)
      let note = reason

      if (applyPriority) {
        const r = computePriorityPoints(points, k)
        award = r.finalPoints
        if (r.applied.length) note = `${reason} — ${r.reason}`
      }

      await User.findByIdAndUpdate(k._id, { $inc:{ points: award } })
      await Points.create({
        user:         k._id,
        pointsEarned: award,
        type:         'awarded',
        reason:       note,
        meeting:      meeting  || undefined,
        activity:     activity || undefined,
      })
      awarded++
      totalPts += award
    }

    await AuditLog.create({
      user: req.user._id, action: 'BULK_AWARD_POINTS',
      details: `${req.user.firstName} ${req.user.lastName} awarded points to ${awarded} kabataan (base ${points}, priority ${applyPriority ? 'on' : 'off'}, total ${totalPts} pts) — Reason: ${reason}`,
    })
    res.json({ message:`Awarded points to ${awarded} kabataan.`, count:awarded, totalPoints: totalPts })
  } catch (e) { res.status(500).json({ message:e.message }) }
}

module.exports = { getMyPoints, getHistory, getLeaderboard, awardPoints, bulkAward }