const Meeting  = require('../models/Meeting')
const AuditLog = require('../models/AuditLog')

// @GET /api/meetings
const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting
      .find()
      .populate('organizer', 'firstName lastName')
      .sort({ date: 1 })
    res.json({ meetings })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/meetings/:id
const getMeeting = async (req, res) => {
  try {
    const meeting = await Meeting
      .findById(req.params.id)
      .populate('organizer',    'firstName lastName')
      .populate('attendance.user', 'firstName lastName')
      .populate('rsvp.user',    'firstName lastName')

    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })
    res.json({ meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/meetings
const createMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.create({
      ...req.body,
      organizer: req.user._id
    })
    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_MEETING',
      details: `Created meeting: ${meeting.title}`
    })
    res.status(201).json({ message: 'Meeting created', meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/meetings/:id
const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting
      .findByIdAndUpdate(req.params.id, req.body, { new: true })
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
    res.json({ message: 'Meeting deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/meetings/:id/rsvp
const rsvpMeeting = async (req, res) => {
  try {
    const { response } = req.body
    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    const existing = meeting.rsvp.find(
      r => r.user.toString() === req.user._id.toString()
    )
    if (existing) {
      existing.response = response
    } else {
      meeting.rsvp.push({ user: req.user._id, response })
    }
    await meeting.save()
    res.json({ message: 'RSVP updated', meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/meetings/:id/attendance
const updateAttendance = async (req, res) => {
  try {
    const { userId, status } = req.body
    const meeting = await Meeting.findById(req.params.id)
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' })

    const existing = meeting.attendance.find(
      a => a.user.toString() === userId
    )
    if (existing) {
      existing.status = status
    } else {
      meeting.attendance.push({ user: userId, status })
    }
    await meeting.save()
    res.json({ message: 'Attendance updated', meeting })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getMeetings, getMeeting, createMeeting,
  updateMeeting, deleteMeeting,
  rsvpMeeting, updateAttendance
}