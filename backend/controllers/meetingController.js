const Meeting      = require('../models/Meeting')
const Announcement = require('../models/Announcement')
const Points       = require('../models/Points')
const User         = require('../models/User')
const AuditLog     = require('../models/AuditLog')
const crypto       = require('crypto')

const TYPE_POINTS = {
  Meeting: 10, Workshop: 15, Event: 20,
  Seminar: 15, Livelihood: 20, Sports: 15,
}

// @GET /api/meetings
const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting
      .find()
      .populate('organizer', 'firstName lastName')
      .populate('comments.user', 'firstName lastName role')
      .sort({ date: 1 })

    // Strip qrToken from kabataan users — they must scan physically
    const isKabataan = req.user.role === 'kabataan_user'
    const sanitized  = meetings.map(m => {
      const obj = m.toObject()
      if (isKabataan) delete obj.qrToken
      return obj
    })
    res.json({ meetings: sanitized })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/meetings/:id
const getMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer',       'firstName lastName')
      .populate('checkedIn.user',  'firstName lastName barangay municipality')
      .populate('attendance.user', 'firstName lastName')
      .populate('rsvp.user',       'firstName lastName')
      .populate('comments.user',   'firstName lastName role')
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    // Strip qrToken for kabataan users
    const obj = meeting.toObject()
    if (req.user.role === 'kabataan_user') delete obj.qrToken
    res.json({ meeting: obj })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/meetings
// Auto-generates QR token (inactive until SK activates) + auto-creates announcement
const createMeeting = async (req, res) => {
  try {
    const pts     = TYPE_POINTS[req.body.type] || req.body.pointsReward || 10
    const qrToken = crypto.randomBytes(32).toString('hex')

    const meeting = await Meeting.create({
      ...req.body,
      organizer:    req.user._id,
      pointsReward: pts,
      qrToken,
      qrActive:     false,
    })

    // Auto-create announcement
    try {
      const dateStr = new Date(meeting.date).toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      await Announcement.create({
        title:    `📅 ${meeting.type}: ${meeting.title}`,
        content:  `A new SK ${meeting.type} has been scheduled.\n\n` +
                  `📅 Date: ${dateStr}\n` +
                  (meeting.time   ? `⏰ Time: ${meeting.time}\n`  : '') +
                  (meeting.venue  ? `📍 Venue: ${meeting.venue}${meeting.municipality ? ', ' + meeting.municipality : ''}\n` : '') +
                  (meeting.agenda ? `\n📋 Agenda:\n${meeting.agenda}\n` : '') +
                  `\nAttend and earn ⭐ ${pts} points via QR check-in!`,
        category: meeting.type === 'Meeting' ? 'Meetings' : 'Events',
        author:   req.user._id,
        isPinned: false,
      })
    } catch (annErr) {
      console.log('Auto-announcement (non-critical):', annErr.message)
    }

    await AuditLog.create({
      user:    req.user._id,
      action:  'CREATE_MEETING',
      details: `Created ${meeting.type}: ${meeting.title}`,
    })

    res.status(201).json({ message: 'Meeting created', meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/meetings/:id
const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })
    res.json({ message: 'Meeting updated', meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @DELETE /api/meetings/:id
const deleteMeeting = async (req, res) => {
  try {
    await Meeting.findByIdAndDelete(req.params.id)
    await AuditLog.create({
      user: req.user._id, action: 'DELETE_MEETING',
      details: `Deleted meeting ID: ${req.params.id}`,
    })
    res.json({ message: 'Meeting deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/meetings/:id/rsvp
const rsvpMeeting = async (req, res) => {
  try {
    const meeting  = await Meeting.findById(req.params.id)
    if (!meeting)  return res.status(404).json({ message: 'Meeting not found' })
    const existing = meeting.rsvp.find(r => r.user.toString() === req.user._id.toString())
    if (existing)  meeting.rsvp = meeting.rsvp.filter(r => r.user.toString() !== req.user._id.toString())
    else           meeting.rsvp.push({ user: req.user._id, status: 'going' })
    await meeting.save()
    res.json({ message: existing ? 'RSVP removed' : 'RSVP added', meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/meetings/:id/attendance
const updateAttendance = async (req, res) => {
  try {
    const { userId, present } = req.body
    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })
    const existing = meeting.attendance.find(a => a.user.toString() === userId)
    if (existing) existing.present = present
    else          meeting.attendance.push({ user: userId, present })
    await meeting.save()
    res.json({ message: 'Attendance updated', meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/meetings/:id/generate-qr
// SK Officer activates the QR when event starts
const generateQR = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    if (!meeting.qrToken) {
      meeting.qrToken = crypto.randomBytes(32).toString('hex')
    }
    const durationMinutes = req.body.durationMinutes || 120
    meeting.qrActive = true
    meeting.qrExpiry = new Date(Date.now() + durationMinutes * 60 * 1000)
    await meeting.save()

    await AuditLog.create({
      user: req.user._id, action: 'GENERATE_QR',
      details: `Activated QR for: ${meeting.title}`,
    })

    res.json({ message: 'QR code activated', qrToken: meeting.qrToken, qrExpiry: meeting.qrExpiry, meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/meetings/:id/deactivate-qr
const deactivateQR = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { qrActive: false },
      { new: true }
    )

    // Move the related announcement to "History" category
    try {
      await Announcement.updateMany(
        {
          title: { $regex: meeting.title, $options: 'i' },
          category: { $in: ['Events', 'Meetings'] }
        },
        { category: 'History' }
      )
    } catch (annErr) {
      console.log('Announcement update (non-critical):', annErr.message)
    }

    res.json({ message: 'QR deactivated. Event ended.', meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/meetings/checkin
// Kabataan user scans QR or pastes token
const checkIn = async (req, res) => {
  try {
    const { qrToken } = req.body
    if (!qrToken) return res.status(400).json({ message: 'QR token is required.' })

    const meeting = await Meeting.findOne({ qrToken })
    if (!meeting)          return res.status(404).json({ message: 'Invalid QR code. Event not found.' })
    if (!meeting.qrActive) return res.status(400).json({ message: 'QR check-in is not active. Wait for the SK Officer to activate it.' })
    if (meeting.qrExpiry && new Date() > meeting.qrExpiry) {
      return res.status(400).json({ message: 'QR code has expired. Ask your SK Officer.' })
    }

    const already = meeting.checkedIn.find(c => c.user.toString() === req.user._id.toString())
    if (already) {
      const pts = TYPE_POINTS[meeting.type] || meeting.pointsReward || 10
      return res.status(400).json({
        message: 'You already checked in to this event.',
        alreadyCheckedIn: true, pointsAwarded: pts,
      })
    }

    const pointsToAward = TYPE_POINTS[meeting.type] || meeting.pointsReward || 10
    meeting.checkedIn.push({ user: req.user._id, checkedInAt: new Date() })
    await meeting.save()

    // Save to Points collection AND update User.points balance
    await Points.create({
      user:         req.user._id,
      meeting:      meeting._id,
      pointsEarned: pointsToAward,
      type:         'earned',
      reason:       `Attended: ${meeting.title} (${meeting.type})`,
      checkedInAt:  new Date(),
    })

    // Increment User.points so balance is always up to date
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: pointsToAward } })

    await AuditLog.create({
      user: req.user._id, action: 'QR_CHECKIN',
      details: `${req.user.firstName} ${req.user.lastName} checked in to: ${meeting.title} (+${pointsToAward} pts)`,
    })

    res.json({
      message: 'Check-in successful!',
      pointsAwarded: pointsToAward,
      meeting: { title: meeting.title, type: meeting.type },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/meetings/:id/checkins
const getCheckIns = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('checkedIn.user', 'firstName lastName email barangay municipality')
    if (!meeting) return res.status(404).json({ message: 'Not found' })
    res.json({ checkedIn: meeting.checkedIn, total: meeting.checkedIn.length })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/meetings/:id/comments
// Open forum — any user can post after event
const addComment = async (req, res) => {
  try {
    const { text } = req.body
    if (!text || !text.trim())         return res.status(400).json({ message: 'Comment cannot be empty.' })
    if (text.trim().length > 500)      return res.status(400).json({ message: 'Max 500 characters.' })

    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    meeting.comments.push({ user: req.user._id, text: text.trim(), createdAt: new Date() })
    await meeting.save()

    const updated  = await Meeting.findById(req.params.id).populate('comments.user', 'firstName lastName role')
    const newComment = updated.comments[updated.comments.length - 1]

    res.status(201).json({ message: 'Comment posted', comment: newComment })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @DELETE /api/meetings/:id/comments/:commentId
const deleteComment = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    const comment = meeting.comments.id(req.params.commentId)
    if (!comment) return res.status(404).json({ message: 'Comment not found' })

    const isOwner  = comment.user.toString() === req.user._id.toString()
    const canAdmin = ['admin', 'sk_officer'].includes(req.user.role)
    if (!isOwner && !canAdmin) return res.status(403).json({ message: 'Cannot delete this comment.' })

    comment.deleteOne()
    await meeting.save()
    res.json({ message: 'Comment deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getMeetings, getMeeting, createMeeting, updateMeeting, deleteMeeting,
  rsvpMeeting, updateAttendance, generateQR, deactivateQR,
  checkIn, getCheckIns, addComment, deleteComment,
}