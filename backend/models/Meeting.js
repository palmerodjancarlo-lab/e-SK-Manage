// Meeting.js model
// Includes: QR check-in, attendance, RSVP, comments (open forum)

const mongoose = require('mongoose')

const CommentSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
})

const MeetingSchema = new mongoose.Schema({
  title: {
    type:     String,
    required: [true, 'Title is required'],
    trim:     true,
  },
  type: {
    type:    String,
    enum:    ['Meeting', 'Workshop', 'Event', 'Seminar', 'Livelihood', 'Sports'],
    default: 'Meeting',
  },
  date: {
    type:     Date,
    required: [true, 'Date is required'],
  },
  time:        String,
  venue:       String,
  municipality: String,
  agenda:      String,
  description: String,

  organizer: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  // Points awarded for checking in to this event
  pointsReward: {
    type:    Number,
    default: 10,
  },

  // QR check-in
  qrToken:  { type: String, unique: true, sparse: true },
  qrActive: { type: Boolean, default: false },
  qrExpiry: { type: Date },

  // Who scanned QR and checked in
  checkedIn: [{
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedInAt: { type: Date, default: Date.now },
  }],

  // Manual attendance tracking by SK Officer
  attendance: [{
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    present: { type: Boolean, default: false },
  }],

  // RSVP
  rsvp: [{
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['going', 'notgoing', 'maybe'], default: 'going' },
  }],

  // Open forum — kabataan users comment after event
  comments: [CommentSchema],

}, { timestamps: true })

module.exports = mongoose.model('Meeting', MeetingSchema)