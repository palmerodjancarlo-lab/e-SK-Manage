// models/Redemption.js
// A kabataan's request to redeem a reward. Points are deducted and stock is reserved
// when the request is made (first come, first served); an SK officer marks it claimed
// when the item is handed over. Cancelled or rejected requests get their points back.
const mongoose = require('mongoose')

const redemptionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reward:      { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
  rewardTitle: { type: String, required: true },   // snapshot, in case the reward is edited later
  points:      { type: Number, required: true, min: 1 },
  status:      { type: String, enum: ['pending', 'claimed', 'cancelled', 'rejected'], default: 'pending' },
  pointsEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'Points' }, // the 'redeemed' ledger row
  note:        { type: String, default: '', trim: true },                 // rejection reason
  handledBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  handledAt:   { type: Date, default: null },
}, { timestamps: true })

redemptionSchema.index({ status: 1, createdAt: 1 })
redemptionSchema.index({ user: 1, createdAt: -1 })

// Short code the member shows when picking up the reward, e.g. "R-3F9A2C"
redemptionSchema.virtual('code').get(function () {
  return `R-${String(this._id).slice(-6).toUpperCase()}`
})
redemptionSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Redemption', redemptionSchema)
