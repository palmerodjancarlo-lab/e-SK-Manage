// controllers/redemptionController.js
// Reward redemption: kabataan request → points deducted + stock reserved (first come,
// first served) → SK officer marks it claimed when the item is handed over.
// Cancelled (by the member) or rejected (by the SK) requests are refunded.
const mongoose   = require('mongoose')
const Redemption = require('../models/Redemption')
const Reward     = require('../models/Reward')
const Points     = require('../models/Points')
const User       = require('../models/User')
const AuditLog   = require('../models/AuditLog')
const Notification = require('../models/Notification')
const serverError = require('../utils/serverError')
const { pointsEligibility } = require('../config/pointsPolicy')

const isId = (id) => mongoose.Types.ObjectId.isValid(id)
const name = (u) => `${u.firstName} ${u.lastName}`

// Balance from the points ledger (source of truth): earned + awarded − redeemed
const ledgerBalance = async (userId) => {
  const rows = await Points.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: '$type', total: { $sum: '$pointsEarned' } } },
  ])
  const t = Object.fromEntries(rows.map((r) => [r._id, r.total]))
  return (t.earned || 0) + (t.awarded || 0) - (t.redeemed || 0)
}

const notify = (doc) => Notification.create(doc).catch((e) => console.error('[redemption] notification failed:', e.message))

// Give the points and the reserved stock back.
const refund = async (r) => {
  if (r.pointsEntry) await Points.findByIdAndDelete(r.pointsEntry)
  await User.findByIdAndUpdate(r.user._id || r.user, { $inc: { points: r.points } })
  await Reward.updateOne({ _id: r.reward._id || r.reward, stock: { $gte: 0 } }, { $inc: { stock: 1 } })
}

// POST /api/v1/rewards/:id/redeem  (kabataan)
const requestRedemption = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Reward not found.' })
    const elig = pointsEligibility(req.user)
    if (!elig.eligible) return res.status(403).json({ message: elig.reason })

    const reward = await Reward.findById(req.params.id)
    if (!reward || !reward.isActive) return res.status(404).json({ message: 'Reward not found.' })
    if (reward.stock === 0) return res.status(400).json({ message: 'Sorry, this reward is out of stock.' })

    const waiting = await Redemption.exists({ user: req.user._id, reward: reward._id, status: 'pending' })
    if (waiting) return res.status(400).json({ message: 'You already have a request for this reward waiting for pickup.' })

    const cost = reward.pointsRequired
    // Sync the cached balance with the ledger, then deduct only if there is enough —
    // the conditional update stops a double tap from spending the same points twice.
    await User.findByIdAndUpdate(req.user._id, { points: await ledgerBalance(req.user._id) })
    const paid = await User.findOneAndUpdate({ _id: req.user._id, points: { $gte: cost } }, { $inc: { points: -cost } })
    if (!paid) return res.status(400).json({ message: `You need ${cost} points for this reward.` })

    // Reserve one item (unlimited rewards have stock −1)
    if (reward.stock !== -1) {
      const reserved = await Reward.findOneAndUpdate({ _id: reward._id, isActive: true, stock: { $gt: 0 } }, { $inc: { stock: -1 } })
      if (!reserved) {
        await User.findByIdAndUpdate(req.user._id, { $inc: { points: cost } })
        return res.status(400).json({ message: 'Sorry, the last one was just taken.' })
      }
    }

    const entry = await Points.create({ user: req.user._id, pointsEarned: cost, type: 'redeemed', reason: `Redeemed: ${reward.title}` })
    const r = await Redemption.create({ user: req.user._id, reward: reward._id, rewardTitle: reward.title, points: cost, pointsEntry: entry._id })

    await AuditLog.create({
      user: req.user._id, ipAddress: req.ip, userAgent: req.headers['user-agent'],
      action: 'REQUEST_REDEMPTION',
      details: `${name(req.user)} requested "${reward.title}" for ${cost} pts (${r.code}).`,
    })
    res.status(201).json({ message: `Request sent. ${cost} points were deducted — show code ${r.code} to an SK officer to claim it.`, redemption: r })
  } catch (e) { serverError(res, e) }
}

// GET /api/v1/rewards/redemptions/mine  (kabataan)
const myRedemptions = async (req, res) => {
  try {
    const redemptions = await Redemption.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50)
    res.json({ redemptions })
  } catch (e) { serverError(res, e) }
}

// PUT /api/v1/rewards/redemptions/:id/cancel  (kabataan, own pending request)
const cancelRedemption = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Request not found.' })
    // Atomic status change so a cancel and a claim can't both happen
    const r = await Redemption.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'pending' },
      { status: 'cancelled', handledBy: req.user._id, handledAt: new Date() },
      { new: true },
    )
    if (!r) return res.status(404).json({ message: 'Request not found or already handled.' })
    await refund(r)
    await AuditLog.create({ user: req.user._id, action: 'CANCEL_REDEMPTION', details: `${name(req.user)} cancelled "${r.rewardTitle}" (${r.code}); ${r.points} pts returned.` })
    res.json({ message: `Request cancelled. ${r.points} points were returned.`, redemption: r })
  } catch (e) { serverError(res, e) }
}

// GET /api/v1/rewards/redemptions?status=pending  (SK officers) — oldest first (queue order)
const listRedemptions = async (req, res) => {
  try {
    const status = ['pending', 'claimed', 'cancelled', 'rejected'].includes(req.query.status) ? req.query.status : undefined
    const redemptions = await Redemption.find(status ? { status } : {})
      .sort(status === 'pending' ? { createdAt: 1 } : { updatedAt: -1 })
      .limit(200)
      .populate('user', 'firstName lastName email photo')
      .populate('handledBy', 'firstName lastName role')
    res.json({ redemptions })
  } catch (e) { serverError(res, e) }
}

// PUT /api/v1/rewards/redemptions/:id/claim  (SK officers) — item handed over
const claimRedemption = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Request not found.' })
    const r = await Redemption.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'claimed', handledBy: req.user._id, handledAt: new Date() },
      { new: true },
    ).populate('user', 'firstName lastName')
    if (!r) return res.status(404).json({ message: 'Request not found or already handled.' })

    await AuditLog.create({ user: req.user._id, action: 'CLAIM_REDEMPTION', details: `${name(req.user)} handed "${r.rewardTitle}" to ${name(r.user)} (${r.code}).` })
    notify({ user: r.user._id, type: 'REWARD_CLAIMED', link: '/kabataan/rewards?tab=history', title: 'Reward claimed', message: `You received "${r.rewardTitle}". Enjoy!` })
    res.json({ message: `Marked as claimed — ${r.rewardTitle} for ${name(r.user)}.`, redemption: r })
  } catch (e) { serverError(res, e) }
}

// PUT /api/v1/rewards/redemptions/:id/reject  (SK officers) — body: { reason }
const rejectRedemption = async (req, res) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : ''
    if (!reason) return res.status(400).json({ message: 'A reason is required.' })
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Request not found.' })
    const r = await Redemption.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'rejected', note: reason, handledBy: req.user._id, handledAt: new Date() },
      { new: true },
    ).populate('user', 'firstName lastName')
    if (!r) return res.status(404).json({ message: 'Request not found or already handled.' })

    await refund(r)
    await AuditLog.create({ user: req.user._id, action: 'REJECT_REDEMPTION', details: `${name(req.user)} rejected "${r.rewardTitle}" for ${name(r.user)} (${r.code}); ${r.points} pts returned. Reason: ${reason}` })
    notify({ user: r.user._id, type: 'REWARD_REJECTED', link: '/kabataan/rewards?tab=history', title: 'Reward request not approved', message: `Your ${r.points} points for "${r.rewardTitle}" were returned. Reason: ${reason}` })
    res.json({ message: `Request rejected; ${r.points} points returned.`, redemption: r })
  } catch (e) { serverError(res, e) }
}

module.exports = { requestRedemption, myRedemptions, cancelRedemption, listRedemptions, claimRedemption, rejectRedemption, ledgerBalance }
