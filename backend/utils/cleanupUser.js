// utils/cleanupUser.js
// Tidy up after a member account is deleted (self-delete or by the Chairperson):
// give back stock reserved by their waiting reward requests, free their RSVP and
// volunteer slots, and drop their points ledger and notifications.
// Audit log entries are kept — they are the accountability record.
const Redemption   = require('../models/Redemption')
const Reward       = require('../models/Reward')
const Points       = require('../models/Points')
const Meeting      = require('../models/Meeting')
const Notification = require('../models/Notification')

const cleanupUser = async (userId) => {
  const pending = await Redemption.find({ user: userId, status: 'pending' })
  for (const r of pending) {
    await Reward.updateOne({ _id: r.reward, stock: { $gte: 0 } }, { $inc: { stock: 1 } })
  }
  await Promise.all([
    Redemption.updateMany({ user: userId, status: 'pending' }, { status: 'cancelled', note: 'Account deleted', handledAt: new Date() }),
    Meeting.updateMany({}, { $pull: { rsvp: { user: userId }, volunteers: { user: userId } } }),
    Points.deleteMany({ user: userId }),
    Notification.deleteMany({ user: userId }),
  ])
}

module.exports = cleanupUser
