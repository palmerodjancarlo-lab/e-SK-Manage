// utils/heldPoints.js
// Points an unverified kabataan earns (e.g. QR check-in) are kept as type 'held':
// the attendance counts, but the points don't reach their balance, the leaderboard
// or rewards until the SK Chairperson verifies their residency. On verification
// every held row becomes 'earned' and the total is added to their balance.
const Points = require('../models/Points')
const User   = require('../models/User')

// Returns { count, total } of the points released.
const releaseHeldPoints = async (userId) => {
  const rows = await Points.find({ user: userId, type: 'held' }).select('_id pointsEarned').lean()
  if (!rows.length) return { count: 0, total: 0 }

  const ids = rows.map((r) => r._id)
  const result = await Points.updateMany({ _id: { $in: ids }, type: 'held' }, { $set: { type: 'earned' } })
  // A parallel request already released them — don't add the points twice
  if (!result.modifiedCount) return { count: 0, total: 0 }

  const total = rows.reduce((n, r) => n + (r.pointsEarned || 0), 0)
  await User.findByIdAndUpdate(userId, { $inc: { points: total } })
  return { count: rows.length, total }
}

module.exports = { releaseHeldPoints }
