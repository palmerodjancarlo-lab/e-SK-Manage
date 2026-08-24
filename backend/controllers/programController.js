// controllers/programController.js
// Manages Programs (umbrella), Projects (under program), Activities (under project)
// Budget rolls up: Activity actualCost → Project totalActivityCost → Program totalProjectCost

const Program  = require('../models/Program')
const Project  = require('../models/Project')
const Activity = require('../models/Activity')
const Points   = require('../models/Points')
const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

// Helper: recalculate project cost from its activities
const syncProjectCost = async (projectId) => {
  const activities = await Activity.find({ project: projectId })
  const total = activities.reduce((sum, a) => sum + (a.actualCost || a.estimatedCost || 0), 0)
  await Project.findByIdAndUpdate(projectId, { totalActivityCost: total })
  return total
}

// Helper: recalculate program cost from its projects
const syncProgramCost = async (programId) => {
  const projects = await Project.find({ program: programId })
  const total = projects.reduce((sum, p) => sum + (p.totalActivityCost || 0), 0)
  await Program.findByIdAndUpdate(programId, { totalProjectCost: total })
  return total
}

// ── PROGRAMS ──────────────────────────────────────────────────────────────────

// GET /api/programs
const getPrograms = async (req, res) => {
  try {
    const programs = await Program.find()
      .populate('organizer', 'firstName lastName position')
      .sort({ createdAt: -1 })
    res.json({ programs })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/programs/:id
const getProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate('organizer', 'firstName lastName position')
    if (!program) return res.status(404).json({ message: 'Program not found' })

    // Get all projects under this program
    const projects = await Project.find({ program: program._id })
      .populate('coordinator', 'firstName lastName')

    res.json({ program, projects })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/programs
const createProgram = async (req, res) => {
  try {
    const { title, description, category, startDate, endDate, municipality, barangay, fundSources, notes } = req.body
    if (!title) return res.status(400).json({ message: 'Program title is required.' })

    // Compute totalBudget from fundSources
    const totalBudget = (fundSources || []).reduce((sum, f) => sum + (f.amount || 0), 0)

    const program = await Program.create({
      title, description, category, startDate, endDate,
      municipality, barangay, fundSources: fundSources || [],
      totalBudget, organizer: req.user._id, notes,
    })

    await AuditLog.create({ user: req.user._id, action: 'CREATE_PROGRAM', details: `Created Program: ${title}` })
    res.status(201).json({ message: 'Program created.', program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/programs/:id
const updateProgram = async (req, res) => {
  try {
    const { fundSources, ...rest } = req.body
    let update = { ...rest }

    if (fundSources) {
      update.fundSources = fundSources
      update.totalBudget = fundSources.reduce((sum, f) => sum + (f.amount || 0), 0)
    }

    const program = await Program.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!program) return res.status(404).json({ message: 'Program not found' })

    await AuditLog.create({ user: req.user._id, action: 'UPDATE_PROGRAM', details: `Updated Program: ${program.title}` })
    res.json({ message: 'Program updated.', program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// DELETE /api/programs/:id
const deleteProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id)
    if (!program) return res.status(404).json({ message: 'Program not found' })
    await AuditLog.create({ user: req.user._id, action: 'DELETE_PROGRAM', details: `Deleted Program: ${program.title}` })
    res.json({ message: 'Program deleted.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── PROJECTS ──────────────────────────────────────────────────────────────────

// GET /api/programs/:programId/projects
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ program: req.params.programId })
      .populate('coordinator', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
    res.json({ projects })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/programs/:programId/projects
const createProject = async (req, res) => {
  try {
    const { title, description, status, startDate, endDate, coordinator, allocatedBudget, notes } = req.body
    if (!title) return res.status(400).json({ message: 'Project title is required.' })

    const program = await Program.findById(req.params.programId)
    if (!program) return res.status(404).json({ message: 'Program not found' })

    const project = await Project.create({
      program: program._id, title, description, status,
      startDate, endDate, coordinator, allocatedBudget: allocatedBudget || 0,
      createdBy: req.user._id, notes,
    })

    await AuditLog.create({ user: req.user._id, action: 'CREATE_PROJECT', details: `Created Project: ${title} under Program: ${program.title}` })
    res.status(201).json({ message: 'Project created.', project })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!project) return res.status(404).json({ message: 'Project not found' })

    // Sync program cost
    await syncProgramCost(project.program)

    await AuditLog.create({ user: req.user._id, action: 'UPDATE_PROJECT', details: `Updated Project: ${project.title}` })
    res.json({ message: 'Project updated.', project })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    await syncProgramCost(project.program)
    await AuditLog.create({ user: req.user._id, action: 'DELETE_PROJECT', details: `Deleted Project: ${project.title}` })
    res.json({ message: 'Project deleted.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── ACTIVITIES ────────────────────────────────────────────────────────────────

// GET /api/projects/:projectId/activities
const getActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ project: req.params.projectId })
      .populate('createdBy', 'firstName lastName')
      .sort({ startDate: 1 })
    res.json({ activities })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/projects/:projectId/activities
const createActivity = async (req, res) => {
  try {
    const { title, description, type, startDate, endDate, venue, estimatedCost, pointsPerDay, notes } = req.body
    if (!title || !startDate || !endDate) return res.status(400).json({ message: 'Title, start date, and end date are required.' })

    const project = await Project.findById(req.params.projectId).populate('program')
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const activity = await Activity.create({
      project: project._id,
      program: project.program._id,
      title, description, type, startDate, endDate,
      venue, estimatedCost: estimatedCost || 0,
      pointsPerDay: pointsPerDay || 0,
      createdBy: req.user._id, notes,
    })

    // Sync costs up
    await syncProjectCost(project._id)
    await syncProgramCost(project.program._id)

    await AuditLog.create({ user: req.user._id, action: 'CREATE_ACTIVITY', details: `Created Activity: ${title} under Project: ${project.title}` })
    res.status(201).json({ message: 'Activity created.', activity })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/activities/:id
const updateActivity = async (req, res) => {
  try {
    const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!activity) return res.status(404).json({ message: 'Activity not found' })

    // Sync costs up
    await syncProjectCost(activity.project)
    const project = await Project.findById(activity.project)
    if (project) await syncProgramCost(project.program)

    await AuditLog.create({ user: req.user._id, action: 'UPDATE_ACTIVITY', details: `Updated Activity: ${activity.title}` })
    res.json({ message: 'Activity updated.', activity })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── ATTENDANCE & POINTS (Prorated) ────────────────────────────────────────────

// POST /api/activities/:id/attendance
// Record attendance for a kabataan user — points are prorated
const recordAttendance = async (req, res) => {
  try {
    const { userId, daysAttended } = req.body
    if (!userId || daysAttended === undefined) return res.status(400).json({ message: 'userId and daysAttended are required.' })

    const activity = await Activity.findById(req.params.id)
    if (!activity) return res.status(404).json({ message: 'Activity not found' })

    if (daysAttended > activity.totalDays) return res.status(400).json({ message: `Cannot exceed total days (${activity.totalDays}).` })

    // Prorated points: (daysAttended / totalDays) * totalPoints
    const pointsEarned = activity.totalDays > 0
      ? Math.round((daysAttended / activity.totalDays) * activity.totalPoints)
      : 0

    // Check if already recorded
    const existing = activity.attendance.find(a => a.user.toString() === userId)
    if (existing) {
      // Update existing record
      const oldPoints = existing.pointsEarned
      existing.daysAttended = daysAttended
      existing.pointsEarned = pointsEarned
      existing.recordedBy   = req.user._id
      existing.recordedAt   = new Date()
      await activity.save()

      // Adjust user points
      const diff = pointsEarned - oldPoints
      await User.findByIdAndUpdate(userId, { $inc: { points: diff } })

      return res.json({ message: 'Attendance updated.', pointsEarned, daysAttended })
    }

    // New attendance record
    activity.attendance.push({ user: userId, daysAttended, pointsEarned, recordedBy: req.user._id })
    await activity.save()

    // Award points
    await User.findByIdAndUpdate(userId, { $inc: { points: pointsEarned } })

    // Create Points record for history
    await Points.create({
      user:         userId,
      activity:     activity._id,
      pointsEarned, type: 'earned',
      reason:       `Attended: ${activity.title} (${daysAttended}/${activity.totalDays} days)`,
    })

    await AuditLog.create({
      user:    req.user._id,
      action:  'RECORD_ATTENDANCE',
      details: `Recorded attendance for activity: ${activity.title} — User earned ${pointsEarned} points (${daysAttended}/${activity.totalDays} days)`,
    })

    res.status(201).json({ message: 'Attendance recorded.', pointsEarned, daysAttended, totalDays: activity.totalDays })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/activities/:id/attendance
const getAttendance = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('attendance.user', 'firstName lastName barangay')
    if (!activity) return res.status(404).json({ message: 'Activity not found' })
    res.json({ attendance: activity.attendance, totalDays: activity.totalDays, totalPoints: activity.totalPoints })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


// ── PPA PHOTOS ────────────────────────────────────────────────────────────────

// POST /api/programs/:type/:id/photos  — add a photo to program/project/activity
const addPhoto = async (req, res) => {
  try {
    const { type, id } = req.params
    const { url, caption } = req.body
    if (!url) return res.status(400).json({ message: 'Photo URL is required.' })

    const Model = { program: Program, project: Project, activity: Activity }[type]
    if (!Model) return res.status(400).json({ message: 'Invalid type.' })

    const doc = await Model.findById(id)
    if (!doc) return res.status(404).json({ message: 'Not found.' })

    doc.photos.push({ url, caption: caption||'', uploadedBy: req.user._id })
    await doc.save()

    await AuditLog.create({ user:req.user._id, action:'ADD_PPA_PHOTO', details:`${req.user.firstName} ${req.user.lastName} added a photo to ${type}: ${doc.title}` })
    res.json({ message:'Photo added.', photos: doc.photos })
  } catch (e) { res.status(500).json({ message:e.message }) }
}

// DELETE /api/programs/:type/:id/photos/:photoId
const deletePhoto = async (req, res) => {
  try {
    const { type, id, photoId } = req.params
    const Model = { program: Program, project: Project, activity: Activity }[type]
    if (!Model) return res.status(400).json({ message: 'Invalid type.' })

    const doc = await Model.findById(id)
    if (!doc) return res.status(404).json({ message: 'Not found.' })

    doc.photos = doc.photos.filter(p => p._id.toString() !== photoId)
    await doc.save()
    res.json({ message:'Photo removed.', photos: doc.photos })
  } catch (e) { res.status(500).json({ message:e.message }) }
}

module.exports = {
  // Programs
  getPrograms, getProgram, createProgram, updateProgram, deleteProgram,
  // Projects
  getProjects, createProject, updateProject, deleteProject,
  // Activities
  getActivities, createActivity, updateActivity,
  // Attendance
  recordAttendance, getAttendance,
  addPhoto, deletePhoto,
}