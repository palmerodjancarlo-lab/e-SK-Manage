// Points.js — matches exactly what meetingController.js saves
const mongoose = require('mongoose')

const PointsSchema = new mongoose.Schema({
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Meeting',
  },
  pointsEarned: {
    type:     Number,
    required: true,
  },
  type: {
    type:    String,
    enum:    ['earned', 'redeemed', 'awarded'],
    default: 'earned',
  },
  reason: {
    type: String,
  },
  checkedInAt: {
    type:    Date,
    default: Date.now,
  },
}, { timestamps: true })

module.exports = mongoose.model('Points', PointsSchema)