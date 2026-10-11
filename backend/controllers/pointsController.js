// pointsController.js
const Points = require('../models/Points')
const serverError = require('../utils/serverError')
const User   = require('../models/User')
const AuditLog = require('../models/AuditLog')
const { computePriorityPoints, pointsEligibility } = require('../config/pointsPolicy')

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
    // Points waiting for residency verification (not part of the balance yet)
    const heldRows = await Points.aggregate([
      { $match: { user: req.user._id, type: 'held' } },
      { $group: { _id: null, total: { $sum: '$pointsEarned' } } },
    ])

    await User.findByIdAndUpdate(req.user._id, { points: balance })

    res.json({ balance, held: heldRows[0]?.total || 0 })
  } catch (error) {
    serverError(res, error)
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
    serverError(res, error)
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
    serverError(res, error)
  }
}

// @POST /api/points/award — SK Officer manually awards points
// Body: { userId, points, reason, applyPriority = true }
// applyPriority=false gives the exact flat amount (no bonus).
const awardPoints = async (req, res) => {
  try {
    const { userId, reason, applyPriority = true } = req.body
    const points = Number(req.body.points)
    if (!userId || !req.body.points) return res.status(400).json({ message: 'userId and points required.' })
    // Awards only add points — a negative or fractional amount would quietly take them away
    if (!Number.isInteger(points) || points <= 0 || points > 10000) return res.status(400).json({ message: 'Points must be a whole number from 1 to 10,000.' })

    const kab = await User.findById(userId)
    if (!kab) return res.status(404).json({ message: 'User not found.' })
    const elig = pointsEligibility(kab)
    if (!elig.eligible) return res.status(400).json({ message: elig.reason })

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
    await AuditLog.create({
      user: req.user._id, action: 'AWARD_POINTS',
      details: `${req.user.firstName} ${req.user.lastName} awarded ${award} pts to ${kab.firstName} ${kab.lastName} — ${note}`,
    }).catch(() => {})
    res.json({ message: `Awarded ${award} points.`, points: award })
  } catch (error) {
    serverError(res, error)
  }
}

// POST /api/points/bulk-award
// Award points to multiple kabataan at once (attendance-based).
// Body: { userIds: [...], points, reason, applyPriority = true, meeting?, activity? }
const bulkAward = async (req, res) => {
  try {
    const { userIds, points, reason, applyPriority = true, meeting, activity } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message:'Select at least one kabataan.' })
    if (!Number.isInteger(Number(points)) || points <= 0 || points > 10000) return res.status(400).json({ message:'Points must be a whole number from 1 to 10,000.' })
    if (!reason) return res.status(400).json({ message:'A reason is required.' })

    // Only eligible kabataan (active, residency verified)
    const kabs = (await User.find({ _id:{ $in:userIds }, role:'kabataan' })).filter((k) => pointsEligibility(k).eligible)
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
  } catch (e) { serverError(res, e) }
}

module.exports = { getMyPoints, getHistory, getLeaderboard, awardPoints, bulkAward }