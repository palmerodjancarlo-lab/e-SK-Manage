// meetingController.js
// - QR token auto-generated when meeting is created
// - SK officer activates it when event starts
// - Auto-announcement on create (linked back via sourceType/sourceId)
// - Comments / open forum after event
// - Volunteer sign-up

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
      .populate('comments.user', 'firstName lastName role photo')
      .sort({ date: 1 })

    // Strip qrToken from kabataan users — they must scan physically
    const isKabataan = req.user.role === 'kabataan'
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
      .populate('organizer',        'firstName lastName')
      .populate('checkedIn.user',   'firstName lastName barangay municipality')
      .populate('attendance.user',  'firstName lastName')
      .populate('rsvp.user',        'firstName lastName')
      .populate('comments.user',    'firstName lastName role photo')
      .populate('volunteers.user',  'firstName lastName photo contactNumber purok')
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    // Strip qrToken for kabataan users
    const obj = meeting.toObject()
    if (req.user.role === 'kabataan') delete obj.qrToken
    res.json({ meeting: obj })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/meetings
// Auto-generates QR token (inactive until SK activates) + auto-creates a linked announcement
const createMeeting = async (req, res) => {
  try {
    // SK decides the points. Use their value first; fall back to type default only if not given.
    const pts     = (req.body.pointsReward !== undefined && req.body.pointsReward !== '' && req.body.pointsReward !== null)
                    ? Number(req.body.pointsReward)
                    : (TYPE_POINTS[req.body.type] || 10)
    const qrToken = crypto.randomBytes(32).toString('hex')

    const meeting = await Meeting.create({
      ...req.body,
      organizer:    req.user._id,
      pointsReward: pts,
      qrToken,
      qrActive:     false,
    })

    // Auto-create a linked announcement. Details live in `meta` (structured),
    // so the UI renders a clean labeled layout instead of a text blob.
    try {
      await Announcement.create({
        title:      `${meeting.type}: ${meeting.title}`,
        content:    `The SK has scheduled a new ${String(meeting.type || 'activity').toLowerCase()}. See the details below.`,
        category:   'Events',
        sourceType: 'meeting',
        sourceId:   meeting._id,
        meta: {
          kind:          'meeting',
          eventType:     meeting.type || '',
          date:          meeting.date || null,
          time:          meeting.time || '',
          venue:         meeting.venue ? `${meeting.venue}${meeting.municipality ? ', ' + meeting.municipality : ''}` : '',
          agenda:        meeting.agenda || '',
          points:        pts,
          volunteerRole: meeting.needsVolunteers ? (meeting.volunteerRole || 'Volunteers needed') : '',
        },
        author:     req.user._id,
        isPinned:   false,
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

    // Keep the linked announcement's headline in sync with the meeting title
    try {
      await Announcement.updateMany(
        { sourceType: 'meeting', sourceId: meeting._id },
        { title: `${meeting.type}: ${meeting.title}` }
      )
    } catch (annErr) {
      console.log('Announcement sync (non-critical):', annErr.message)
    }

    res.json({ message: 'Meeting updated', meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @DELETE /api/meetings/:id
// Deleting a meeting also removes its linked announcement(s).
const deleteMeeting = async (req, res) => {
  try {
    await Meeting.findByIdAndDelete(req.params.id)
    await Announcement.deleteMany({ sourceType: 'meeting', sourceId: req.params.id }).catch(() => {})
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

// @PUT /api/meetings/:id/volunteer
// Kabataan sign up as a volunteer, or withdraw if already signed up (toggle).
const volunteerMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })
    if (!meeting.needsVolunteers) {
      return res.status(400).json({ message: 'This event is not accepting volunteers.' })
    }

    const idx = meeting.volunteers.findIndex(v => v.user.toString() === req.user._id.toString())

    // Already signed up → withdraw
    if (idx > -1) {
      meeting.volunteers.splice(idx, 1)
      await meeting.save()
      return res.json({
        message: 'You withdrew from volunteering.',
        volunteering: false,
        count: meeting.volunteers.length,
      })
    }

    // Capacity check (0 slots = unlimited)
    if (meeting.volunteerSlots > 0 && meeting.volunteers.length >= meeting.volunteerSlots) {
      return res.status(400).json({ message: 'Volunteer slots are already full.' })
    }

    meeting.volunteers.push({ user: req.user._id, note: (req.body.note || '').trim() })
    await meeting.save()

    await AuditLog.create({
      user: req.user._id, action: 'VOLUNTEER_SIGNUP',
      details: `${req.user.firstName} ${req.user.lastName} volunteered for: ${meeting.title}`,
    }).catch(() => {})

    res.json({
      message: 'Thank you for volunteering!',
      volunteering: true,
      count: meeting.volunteers.length,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/meetings/:id/volunteers
const getVolunteers = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('volunteers.user', 'firstName lastName photo contactNumber purok')
    if (!meeting) return res.status(404).json({ message: 'Not found' })
    res.json({
      volunteers: meeting.volunteers,
      total: meeting.volunteers.length,
      slots: meeting.volunteerSlots,
      role: meeting.volunteerRole,
    })
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
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    // Move this meeting's linked announcement to the "History" category (event ended).
    try {
      await Announcement.updateMany(
        { sourceType: 'meeting', sourceId: meeting._id },
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
      const pts = meeting.pointsReward || TYPE_POINTS[meeting.type] || 10
      return res.status(400).json({
        message: 'You already checked in to this event.',
        alreadyCheckedIn: true, pointsAwarded: pts,
      })
    }

    const pointsToAward = meeting.pointsReward || TYPE_POINTS[meeting.type] || 10
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

    const updated  = await Meeting.findById(req.params.id).populate('comments.user', 'firstName lastName role photo')
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
    const canAdmin = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'].includes(req.user.role)
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
  rsvpMeeting, updateAttendance, volunteerMeeting, getVolunteers,
  generateQR, deactivateQR,
  checkIn, getCheckIns, addComment, deleteComment,
}