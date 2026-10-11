// Meeting.js model
// Includes: QR check-in, attendance, RSVP, comments (open forum), volunteer sign-up

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
    method:      { type: String, enum: ['qr', 'manual'], default: 'qr' }, // manual = marked present by an officer
    markedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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

  // Minutes of the meeting, written by the SK Secretary (or Chairperson). Officers only.
  minutes: {
    text:       { type: String, default: '', maxlength: 20000 },
    attendees:  { type: String, default: '', maxlength: 2000 },   // who was present (free text)
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    recordedAt: { type: Date, default: null },
  },

  // ── Volunteer sign-up ──
  // SK officer flags an event as needing volunteers; kabataan can sign up.
  needsVolunteers: { type: Boolean, default: false },
  volunteerRole:   { type: String, default: '' },   // what help is needed (e.g. "Registration & crowd control")
  volunteerSlots:  { type: Number, default: 0 },     // 0 = unlimited
  volunteers: [{
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note:       { type: String, default: '', maxlength: 300 },
    signedUpAt: { type: Date, default: Date.now },
  }],

}, { timestamps: true })

module.exports = mongoose.model('Meeting', MeetingSchema)