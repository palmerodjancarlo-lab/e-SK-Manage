const mongoose = require('mongoose')

const MeetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: String,
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  time: {
    type: String,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Physical', 'Virtual', 'Hybrid'],
    default: 'Physical'
  },
  meetingLink: String,
  agenda: String,
  minutes: String,
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendance: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Excused'],
      default: 'Absent'
    }
  }],
  rsvp: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    response: {
      type: String,
      enum: ['Attending', 'Not Attending', 'Maybe'],
      default: 'Maybe'
    }
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringType: {
    type: String,
    enum: ['Weekly', 'Monthly', 'None'],
    default: 'None'
  }
}, { timestamps: true })

module.exports = mongoose.model('Meeting', MeetingSchema)