const mongoose = require('mongoose')

const PointsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['earned', 'redeemed'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Meeting', 'Program', 'Reward']
  }
}, { timestamps: true })

module.exports = mongoose.model('Points', PointsSchema)