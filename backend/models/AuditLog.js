const mongoose = require('mongoose')

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true
  },
  details: String,
  ipAddress: String,
  userAgent: String
}, { timestamps: true })

module.exports = mongoose.model('AuditLog', AuditLogSchema)