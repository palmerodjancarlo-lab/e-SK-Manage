// meetingController.js
// - QR token auto-generated when meeting is created
// - SK officer activates it when event starts
// - Auto-announcement on create (linked back via sourceType/sourceId)
// - Comments / open forum after event
// - Volunteer sign-up

const Meeting      = require('../models/Meeting')
const serverError = require('../utils/serverError')
const Announcement = require('../models/Announcement')
const Points       = require('../models/Points')
const Activity     = require('../models/Activity')
const User         = require('../models/User')
const AuditLog     = require('../models/AuditLog')
const crypto       = require('crypto')
const { computePriorityPoints, pointsEligibility } = require('../config/pointsPolicy')

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
      .populate('minutes.recordedBy', 'firstName lastName role')
      .populate('comments.user', 'firstName lastName role photo')
      .sort({ date: 1 })

    // Strip qrToken from kabataan users — they must scan physically
    const isKabataan = req.user.role === 'kabataan'
    const sanitized  = meetings.map(m => {
      const obj = m.toObject()
      if (isKabataan) { delete obj.qrToken; delete obj.minutes }
      return obj
    })
    res.json({ meetings: sanitized })
  } catch (error) {
    serverError(res, error)
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
    if (req.user.role === 'kabataan') { delete obj.qrToken; delete obj.minutes }
    res.json({ meeting: obj })
  } catch (error) {
    serverError(res, error)
  }
}

const pick = require('../utils/pick')
const MEETING_EDITABLE = ['title', 'type', 'date', 'time', 'venue', 'municipality', 'agenda', 'description',
  'pointsReward', 'needsVolunteers', 'volunteerRole', 'volunteerSlots']

// Structured details shown on the meeting's auto-announcement
const meetingMeta = (meeting, pts) => ({
  kind:          'meeting',
  eventType:     meeting.type || '',
  date:          meeting.date || null,
  time:          meeting.time || '',
  venue:         meeting.venue ? `${meeting.venue}${meeting.municipality ? ', ' + meeting.municipality : ''}` : '',
  agenda:        meeting.agenda || '',
  points:        pts,
  volunteerRole: meeting.needsVolunteers ? (meeting.volunteerRole || 'Volunteers needed') : '',
})

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
      ...pick(req.body, MEETING_EDITABLE),
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
        meta:       meetingMeta(meeting, pts),
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
    serverError(res, error)
  }
}

// @PUT /api/meetings/:id
const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(req.params.id, pick(req.body, MEETING_EDITABLE), { new: true, runValidators: true })
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    // Keep the linked announcement in sync — title and the date/time/venue members read there
    try {
      await Announcement.updateMany(
        { sourceType: 'meeting', sourceId: meeting._id },
        { title: `${meeting.type}: ${meeting.title}`, meta: meetingMeta(meeting, meeting.pointsReward) }
      )
    } catch (annErr) {
      console.log('Announcement sync (non-critical):', annErr.message)
    }

    res.json({ message: 'Meeting updated', meeting })
  } catch (error) {
    serverError(res, error)
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
    serverError(res, error)
  }
}

// @PUT /api/meetings/:id/minutes  (Secretary / Chairperson) — body: { text, attendees }
const saveMinutes = async (req, res) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : ''
    const attendees = typeof req.body.attendees === 'string' ? req.body.attendees.trim() : ''
    if (text.length > 20000) return res.status(400).json({ message: 'Minutes are too long (20,000 characters max).' })
    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })
    const hadMinutes = !!meeting.minutes?.text
    meeting.minutes = { text, attendees, recordedBy: req.user._id, recordedAt: new Date() }
    await meeting.save()
    await AuditLog.create({
      user: req.user._id, action: hadMinutes ? 'UPDATE_MINUTES' : 'RECORD_MINUTES',
      details: `${req.user.firstName} ${req.user.lastName} ${hadMinutes ? 'updated' : 'recorded'} the minutes of: ${meeting.title}`,
    })
    await meeting.populate('minutes.recordedBy', 'firstName lastName role')
    res.json({ message: 'Minutes saved.', minutes: meeting.minutes })
  } catch (error) {
    serverError(res, error)
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
    serverError(res, error)
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
    serverError(res, error)
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
    serverError(res, error)
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
    serverError(res, error)
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
    const asked = Number(req.body.durationMinutes)
    const durationMinutes = Number.isFinite(asked) ? Math.min(Math.max(asked, 5), 720) : 120 // 5 min – 12 h
    meeting.qrActive = true
    meeting.qrExpiry = new Date(Date.now() + durationMinutes * 60 * 1000)
    await meeting.save()

    await AuditLog.create({
      user: req.user._id, action: 'GENERATE_QR',
      details: `Activated QR for: ${meeting.title}`,
    })

    res.json({ message: 'QR code activated', qrToken: meeting.qrToken, qrExpiry: meeting.qrExpiry, meeting })
  } catch (error) {
    serverError(res, error)
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
    serverError(res, error)
  }
}

// Record one member's attendance at an event and give the points — the same rules for
// QR check-in and for an officer marking someone present. Unverified kabataan are
// counted as present; their points are held until their residency is verified.
// Returns { status: 'ok' | 'already' | 'ineligible', points, held, reason }
const recordCheckIn = async (meeting, member, { method = 'qr', markedBy = null } = {}) => {
  const elig = pointsEligibility(member)
  const unverifiedMember = member.role === 'kabataan' && member.isActive !== false && !member.idVerified
  if (!elig.eligible && !unverifiedMember) return { status: 'ineligible', reason: elig.reason }
  const held = !elig.eligible

  // Event points + the PWD / age-bracket priority bonus (config/pointsPolicy.js)
  const basePoints = meeting.pointsReward || TYPE_POINTS[meeting.type] || 10
  const { finalPoints: points, applied, reason: bonusReason } = computePriorityPoints(basePoints, member)

  if (meeting.checkedIn.some(c => c.user.toString() === member._id.toString())) return { status: 'already', points }

  // Claim the check-in atomically: the update only matches if this member is not
  // in the list yet, so a double-tap or parallel request can never award twice.
  const entry = { user: member._id, checkedInAt: new Date() }
  if (method !== 'qr') Object.assign(entry, { method, markedBy })
  const claimed = await Meeting.findOneAndUpdate(
    { _id: meeting._id, 'checkedIn.user': { $ne: member._id } },
    { $push: { checkedIn: entry } },
    { new: true }
  )
  if (!claimed) return { status: 'already', points }

  // Save to the points ledger; only counted points go to User.points
  await Points.create({
    user:         member._id,
    meeting:      meeting._id,
    pointsEarned: points,
    type:         held ? 'held' : 'earned',
    reason:       `Attended: ${meeting.title} (${meeting.type})${applied.length ? ` — ${bonusReason}` : ''}`,
    checkedInAt:  new Date(),
  })
  if (!held) await User.findByIdAndUpdate(member._id, { $inc: { points } })
  return { status: 'ok', points, held }
}

// @POST /api/meetings/checkin
// Kabataan user scans QR or pastes token
const checkIn = async (req, res) => {
  try {
    // Only a plain string may reach the query — an object such as {"$ne": null}
    // would otherwise match any meeting with QR enabled.
    const qrToken = typeof req.body.qrToken === 'string' ? req.body.qrToken.trim() : ''
    if (!qrToken) return res.status(400).json({ message: 'QR token is required.' })

    const meeting = await Meeting.findOne({ qrToken })
    if (!meeting)          return res.status(404).json({ message: 'Invalid QR code. Event not found.' })
    if (!meeting.qrActive) return res.status(400).json({ message: 'QR check-in is not active. Wait for the SK Officer to activate it.' })
    if (meeting.qrExpiry && new Date() > meeting.qrExpiry) {
      return res.status(400).json({ message: 'QR code has expired. Ask your SK Officer.' })
    }

    const r = await recordCheckIn(meeting, req.user)
    if (r.status === 'ineligible') return res.status(403).json({ message: r.reason })
    if (r.status === 'already') {
      return res.status(400).json({ message: 'You already checked in to this event.', alreadyCheckedIn: true, pointsAwarded: r.points })
    }

    await AuditLog.create({
      user: req.user._id, action: 'QR_CHECKIN',
      details: `${req.user.firstName} ${req.user.lastName} checked in to: ${meeting.title} (+${r.points} pts${r.held ? ', held until residency is verified' : ''})`,
    })

    res.json({
      message: r.held
        ? `Checked in! Your ${r.points} points are saved and will be added once the SK Chairperson verifies your residency.`
        : `Checked in! +${r.points} points.`,
      pointsAwarded: r.points,
      pointsHeld: r.held,
      meeting: { title: meeting.title, type: meeting.type },
    })
  } catch (error) {
    serverError(res, error)
  }
}

// @POST /api/meetings/:id/mark-present  (SK officers) — body: { userId }
// For a member who attended but couldn't scan (no phone, no signal).
const markPresent = async (req, res) => {
  try {
    const userId = typeof req.body.userId === 'string' ? req.body.userId : ''
    if (!userId) return res.status(400).json({ message: 'Choose a member.' })
    const [meeting, member] = await Promise.all([Meeting.findById(req.params.id), User.findById(userId)])
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })
    if (!member)  return res.status(404).json({ message: 'Member not found.' })

    const r = await recordCheckIn(meeting, member, { method: 'manual', markedBy: req.user._id })
    if (r.status === 'ineligible') return res.status(400).json({ message: r.reason })
    if (r.status === 'already') return res.status(400).json({ message: `${member.firstName} ${member.lastName} is already marked present.` })

    await AuditLog.create({
      user: req.user._id, action: 'MANUAL_CHECKIN',
      details: `${req.user.firstName} ${req.user.lastName} marked ${member.firstName} ${member.lastName} present at: ${meeting.title} (+${r.points} pts${r.held ? ', held until residency is verified' : ''})`,
    })
    res.status(201).json({
      message: `${member.firstName} ${member.lastName} marked present — ${r.points} pts${r.held ? ' (held until their residency is verified)' : ''}.`,
      pointsAwarded: r.points, pointsHeld: r.held,
    })
  } catch (error) {
    serverError(res, error)
  }
}

// @DELETE /api/meetings/:id/checkins/:userId  (SK officers) — undo a wrong check-in
const removeCheckIn = async (req, res) => {
  try {
    const { userId } = req.params
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, 'checkedIn.user': userId },
      { $pull: { checkedIn: { user: userId } } },
      { new: true }
    )
    if (!meeting) return res.status(404).json({ message: 'That member is not on the attendance list.' })

    // Take back the points from this event (held points were never in the balance)
    const row = await Points.findOneAndDelete({ user: userId, meeting: meeting._id, type: { $in: ['earned', 'held'] } })
    if (row?.type === 'earned') await User.findByIdAndUpdate(userId, { $inc: { points: -row.pointsEarned } })

    const member = await User.findById(userId).select('firstName lastName')
    await AuditLog.create({
      user: req.user._id, action: 'REMOVE_CHECKIN',
      details: `${req.user.firstName} ${req.user.lastName} removed ${member ? `${member.firstName} ${member.lastName}` : 'a member'} from the attendance of: ${meeting.title}${row ? ` (−${row.pointsEarned} pts)` : ''}`,
    })
    res.json({ message: 'Removed from the attendance list.' })
  } catch (error) {
    serverError(res, error)
  }
}

const ageAt = (birthDate, when) => {
  if (!birthDate) return null
  const b = new Date(birthDate), d = new Date(when)
  let age = d.getFullYear() - b.getFullYear()
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) age--
  return Number.isFinite(age) ? age : null
}
const PERSON = 'firstName lastName purok sex birthDate idVerified'
const phDate = (d) => new Date(d).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
const personRow = (u, when) => ({
  _id: u?._id, name: u ? `${u.lastName}, ${u.firstName}` : 'Deleted member',
  purok: u?.purok || '', sex: u?.sex || '', age: ageAt(u?.birthDate, when), verified: !!u?.idVerified,
})

// @GET /api/meetings/:id/attendance-sheet?kind=attendance|signin  (SK officers)
// Data for the downloadable/printable attendance sheet. Personal data, so every
// download is written to the audit trail.
const getAttendanceSheet = async (req, res) => {
  try {
    const kind = req.query.kind === 'signin' ? 'signin' : 'attendance'
    const meeting = await Meeting.findById(req.params.id)
      .populate('checkedIn.user', PERSON)
      .populate('checkedIn.markedBy', 'firstName lastName')
      .populate('rsvp.user', PERSON)
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    const attendees = meeting.checkedIn
      .map((c) => ({ ...personRow(c.user, meeting.date), checkedInAt: c.checkedInAt, method: c.method || 'qr' }))
      .sort((a, b) => a.name.localeCompare(b.name))
    const rsvps = meeting.rsvp
      .filter((r) => r.user)
      .map((r) => personRow(r.user, meeting.date))
      .sort((a, b) => a.name.localeCompare(b.name))

    await AuditLog.create({
      user: req.user._id, action: 'EXPORT_ATTENDANCE',
      details: `${req.user.firstName} ${req.user.lastName} downloaded the ${kind === 'signin' ? 'sign-in sheet' : 'attendance sheet'} of: ${meeting.title}`,
    }).catch(() => {})

    res.json({
      meeting: { _id: meeting._id, title: meeting.title, type: meeting.type, date: meeting.date, time: meeting.time || '', venue: meeting.venue || '', municipality: meeting.municipality || '' },
      attendees, rsvps,
    })
  } catch (error) {
    serverError(res, error)
  }
}

// @GET /api/meetings/attendance-summary?from=YYYY-MM-DD&to=YYYY-MM-DD  (SK officers)
// Who attended which events and activities in a period (for reports and records).
const getAttendanceSummary = async (req, res) => {
  try {
    const now = new Date()
    const parse = (v, fallback) => { const d = v ? new Date(`${v}T00:00:00+08:00`) : fallback; return Number.isNaN(d?.getTime()) ? fallback : d }
    const from = parse(req.query.from, new Date(now.getFullYear(), now.getMonth(), 1))
    const toDay = parse(req.query.to, now)
    const to = new Date(toDay.getTime() + 864e5 - 1) // whole last day
    if (from > to) return res.status(400).json({ message: 'The start date is after the end date.' })

    const [meetings, activities] = await Promise.all([
      Meeting.find({ date: { $gte: from, $lte: to } }).sort({ date: 1 }).populate('checkedIn.user', PERSON),
      Activity.find({ startDate: { $gte: from, $lte: to } }).sort({ startDate: 1 }).populate('attendance.user', PERSON),
    ])

    const events = []
    const members = new Map()
    const mark = (u, eventId, when) => {
      if (!u) return
      const id = String(u._id)
      if (!members.has(id)) members.set(id, { ...personRow(u, when), attended: [] })
      members.get(id).attended.push(eventId)
    }
    for (const m of meetings) {
      events.push({ _id: String(m._id), kind: 'event', title: m.title, type: m.type, date: m.date, count: m.checkedIn.length })
      m.checkedIn.forEach((c) => mark(c.user, String(m._id), m.date))
    }
    for (const a of activities) {
      const present = a.attendance.filter((x) => x.daysAttended > 0)
      events.push({ _id: String(a._id), kind: 'activity', title: a.title, type: a.type, date: a.startDate, count: present.length })
      present.forEach((x) => mark(x.user, String(a._id), a.startDate))
    }
    events.sort((x, y) => new Date(x.date) - new Date(y.date))

    if (req.query.export) {
      await AuditLog.create({
        user: req.user._id, action: 'EXPORT_ATTENDANCE',
        details: `${req.user.firstName} ${req.user.lastName} downloaded the attendance summary (${phDate(from)} to ${phDate(toDay)})`,
      }).catch(() => {})
    }

    res.json({
      from, to,
      events,
      members: [...members.values()].sort((a, b) => b.attended.length - a.attended.length || a.name.localeCompare(b.name)),
    })
  } catch (error) {
    serverError(res, error)
  }
}

// @GET /api/meetings/:id/checkins
const getCheckIns = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('checkedIn.user', 'firstName lastName email barangay municipality purok photo idVerified')
      .populate('checkedIn.markedBy', 'firstName lastName')
    if (!meeting) return res.status(404).json({ message: 'Not found' })
    res.json({ checkedIn: meeting.checkedIn, total: meeting.checkedIn.length })
  } catch (error) {
    serverError(res, error)
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
    serverError(res, error)
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
    serverError(res, error)
  }
}

module.exports = {
  getMeetings, getMeeting, createMeeting, updateMeeting, deleteMeeting,
  rsvpMeeting, updateAttendance, volunteerMeeting, getVolunteers, saveMinutes,
  generateQR, deactivateQR,
  checkIn, markPresent, removeCheckIn, getAttendanceSheet, getAttendanceSummary,
  getCheckIns, addComment, deleteComment,
}