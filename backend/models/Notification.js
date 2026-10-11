// models/Notification.js
// In-app notifications shown in a member's notification bell.
const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:    { type: String, required: true },   // e.g. RESIDENCY_VERIFIED
  title:   { type: String, required: true, trim: true },
  message: { type: String, default: '', trim: true },
  link:    { type: String, default: '' },      // in-app path, e.g. /kabataan/profile
  readAt:  { type: Date, default: null },
}, { timestamps: true })

NotificationSchema.index({ user: 1, createdAt: -1 })
// Old notifications clean themselves up after 180 days.
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 })

module.exports = mongoose.model('Notification', NotificationSchema)
