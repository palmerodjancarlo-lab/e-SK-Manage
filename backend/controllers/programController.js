// controllers/programController.js
// Manages Programs (umbrella), Projects (under program), Activities (under project)
// Budget rolls up: Activity actualCost → Project totalActivityCost → Program totalProjectCost

const Program = require('../models/Program')
const Project = require('../models/Project')
const Activity = require('../models/Activity')
const Points = require('../models/Points')
const User = require('../models/User')
const AuditLog = require('../models/AuditLog')
const { computePriorityPoints, pointsEligibility } = require('../config/pointsPolicy')
const Announcement = require('../models/Announcement')
const Expense = require('../models/Expense')

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
    const {
      title, description, category, status, startDate, endDate, municipality, barangay, fundSources, notes,
      fiscalYear, area, referenceCode, centerOfParticipation, objective, performanceIndicator,
      expectedResults, dateOfImplementation, personResponsible, targets, budget,
    } = req.body
    if (!title) return res.status(400).json({ message: 'Program title is required.' })

    const b = budget || {}
    const budgetSum = (b.mooe || 0) + (b.personnelServices || 0) + (b.capitalOutlay || 0)
    const fundSum = (fundSources || []).reduce((sum, f) => sum + (f.amount || 0), 0)
    const totalBudget = fundSum || budgetSum

    const program = await Program.create({
      title, description, category, status, startDate, endDate,
      municipality, barangay, fundSources: fundSources || [],
      totalBudget, organizer: req.user._id, notes,
      fiscalYear, area, referenceCode, centerOfParticipation, objective, performanceIndicator,
      expectedResults, dateOfImplementation, personResponsible,
      targets: targets || {},
      budget: { mooe: b.mooe || 0, personnelServices: b.personnelServices || 0, capitalOutlay: b.capitalOutlay || 0 },
    })

    // Auto-announcement so the program shows up for everyone (no budget figures shared).
    // Details live in `meta` (structured) for a clean labeled layout in the UI.
    // Linked back via sourceType/sourceId so deleting the program removes it (cascade).
    try {
      await Announcement.create({
        title:      `New Program: ${program.title}`,
        content:    program.description
                      ? program.description
                      : `The SK has added a new program. See the details below.`,
        category:   'Programs',
        sourceType: 'program',
        sourceId:   program._id,
        meta: {
          kind:      'program',
          status:    program.status || '',
          startDate: program.startDate || null,
        },
        author:     req.user._id,
        isPinned:   false,
      })
    } catch (annErr) {
      console.log('Program auto-announcement (non-critical):', annErr.message)
    }

    await AuditLog.create({ user: req.user._id, action: 'CREATE_PROGRAM', details: `Created Program: ${title}` })
    res.status(201).json({ message: 'Program created.', program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/programs/:id
const updateProgram = async (req, res) => {
  try {
    const { fundSources, budget, ...rest } = req.body
    let update = { ...rest }

    if (budget) update.budget = budget

    if (fundSources) {
      update.fundSources = fundSources
      update.totalBudget = fundSources.reduce((sum, f) => sum + (f.amount || 0), 0)
    } else if (budget) {
      const bs = (budget.mooe || 0) + (budget.personnelServices || 0) + (budget.capitalOutlay || 0)
      if (bs) update.totalBudget = bs
    }

    const program = await Program.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!program) return res.status(404).json({ message: 'Program not found' })

    // Keep the linked announcement's headline in sync
    try {
      await Announcement.updateMany(
        { sourceType: 'program', sourceId: program._id },
        { title: `New Program: ${program.title}` }
      )
    } catch (annErr) {
      console.log('Announcement sync (non-critical):', annErr.message)
    }

    await AuditLog.create({ user: req.user._id, action: 'UPDATE_PROGRAM', details: `Updated Program: ${program.title}` })
    res.json({ message: 'Program updated.', program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// DELETE /api/programs/:id
// Deleting a program also removes its linked announcement(s).
const deleteProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id)
    if (!program) return res.status(404).json({ message: 'Program not found' })
    await Announcement.deleteMany({ sourceType: 'program', sourceId: req.params.id }).catch(() => {})
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

    await syncProjectCost(activity.project)
    const project = await Project.findById(activity.project)
    if (project) await syncProgramCost(project.program)

    await AuditLog.create({ user: req.user._id, action: 'UPDATE_ACTIVITY', details: `Updated Activity: ${activity.title}` })
    res.json({ message: 'Activity updated.', activity })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── ATTENDANCE & POINTS (Prorated + Priority bonus) ─────────────────────────────

// POST /api/activities/:id/attendance
// Record attendance for a kabataan — points are prorated AND priority-adjusted
const recordAttendance = async (req, res) => {
  try {
    const { userId, daysAttended } = req.body
    if (!userId || daysAttended === undefined) return res.status(400).json({ message: 'userId and daysAttended are required.' })

    const activity = await Activity.findById(req.params.id)
    if (!activity) return res.status(404).json({ message: 'Activity not found' })
    if (daysAttended > activity.totalDays) return res.status(400).json({ message: `Cannot exceed total days (${activity.totalDays}).` })

    // The member receiving points — must be an eligible (verified, active) kabataan
    const member = await User.findById(userId)
    if (!member) return res.status(404).json({ message: 'Member not found.' })
    const elig = pointsEligibility(member)
    if (!elig.eligible) return res.status(400).json({ message: elig.reason })

    // Base prorated points, then the PWD / age-bracket priority bonus
    const basePoints = activity.totalDays > 0
      ? Math.round((daysAttended / activity.totalDays) * activity.totalPoints)
      : 0
    const { finalPoints, reason: bonusReason, applied } = computePriorityPoints(basePoints, member)

    const reason = applied.length
      ? `Attended: ${activity.title} (${daysAttended}/${activity.totalDays} days) — ${bonusReason}`
      : `Attended: ${activity.title} (${daysAttended}/${activity.totalDays} days)`

    const existing = activity.attendance.find(a => a.user.toString() === userId)
    if (existing) {
      const oldPoints = existing.pointsEarned
      existing.daysAttended = daysAttended
      existing.pointsEarned = finalPoints
      existing.recordedBy = req.user._id
      existing.recordedAt = new Date()
      await activity.save()

      const diff = finalPoints - oldPoints
      await User.findByIdAndUpdate(userId, { $inc: { points: diff } })

      return res.json({
        message: 'Attendance updated.',
        pointsEarned: finalPoints, basePoints,
        bonusApplied: applied.map(a => a.label),
        daysAttended,
      })
    }

    activity.attendance.push({ user: userId, daysAttended, pointsEarned: finalPoints, recordedBy: req.user._id })
    await activity.save()

    await User.findByIdAndUpdate(userId, { $inc: { points: finalPoints } })

    await Points.create({
      user: userId,
      activity: activity._id,
      pointsEarned: finalPoints, type: 'earned',
      reason,
    })

    await AuditLog.create({
      user: req.user._id,
      action: 'RECORD_ATTENDANCE',
      details: `Recorded attendance for activity: ${activity.title} — ${member.firstName} ${member.lastName} earned ${finalPoints} points (${daysAttended}/${activity.totalDays} days${applied.length ? ', priority bonus applied' : ''})`,
    })

    res.status(201).json({
      message: 'Attendance recorded.',
      pointsEarned: finalPoints, basePoints,
      bonusApplied: applied.map(a => a.label),
      daysAttended, totalDays: activity.totalDays,
    })
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

    doc.photos.push({ url, caption: caption || '', uploadedBy: req.user._id })
    await doc.save()

    await AuditLog.create({ user: req.user._id, action: 'ADD_PPA_PHOTO', details: `${req.user.firstName} ${req.user.lastName} added a photo to ${type}: ${doc.title}` })
    res.json({ message: 'Photo added.', photos: doc.photos })
  } catch (e) { res.status(500).json({ message: e.message }) }
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
    res.json({ message: 'Photo removed.', photos: doc.photos })
  } catch (e) { res.status(500).json({ message: e.message }) }
}


// GET /api/programs/public
// Kabataan-safe PPA tree: Program → Project → Activity with photos, status,
// and "spent" (approved expenses) rolled up. No planned/allocated budget is exposed.
const getPublicPrograms = async (req, res) => {
  try {
    const [programs, projects, activities] = await Promise.all([
      Program.find().populate('organizer', 'firstName lastName').sort({ createdAt: -1 }).lean(),
      Project.find().lean(),
      Activity.find().lean(),
    ])

    // lookup maps
    const projToProg = {}, actToProj = {}, actToProg = {}
    projects.forEach((p) => { if (p.program) projToProg[p._id.toString()] = p.program.toString() })
    activities.forEach((a) => { if (a.project) actToProj[a._id.toString()] = a.project.toString(); if (a.program) actToProg[a._id.toString()] = a.program.toString() })

    // spent rollup from approved, non-voided expenses
    const expenses = await Expense.find({ status: 'approved', isVoided: false }, 'amount program project activity').lean()
    const spentProg = {}, spentProj = {}, spentAct = {}
    const add = (map, id, amt) => { if (id) map[id] = (map[id] || 0) + amt }
    for (const e of expenses) {
      const amt = Number(e.amount) || 0
      if (e.activity) {
        const aid = e.activity.toString()
        add(spentAct, aid, amt); add(spentProj, actToProj[aid], amt); add(spentProg, actToProg[aid], amt)
      } else if (e.project) {
        const pid = e.project.toString()
        add(spentProj, pid, amt); add(spentProg, projToProg[pid], amt)
      } else if (e.program) {
        add(spentProg, e.program.toString(), amt)
      }
    }

    const safePhotos = (arr = []) => arr.map((p) => ({ url: p.url, caption: p.caption || '' }))

    const actByProject = {}
    activities.forEach((a) => {
      const pid = (a.project || '').toString()
      if (!actByProject[pid]) actByProject[pid] = []
      actByProject[pid].push({
        _id: a._id, title: a.title, description: a.description, type: a.type, status: a.status,
        startDate: a.startDate, endDate: a.endDate, venue: a.venue,
        points: a.totalPoints || 0,
        spent: spentAct[a._id.toString()] || 0,
        photos: safePhotos(a.photos),
      })
    })

    const projByProgram = {}
    projects.forEach((p) => {
      const gid = (p.program || '').toString()
      if (!projByProgram[gid]) projByProgram[gid] = []
      projByProgram[gid].push({
        _id: p._id, title: p.title, description: p.description, status: p.status,
        startDate: p.startDate, endDate: p.endDate,
        spent: spentProj[p._id.toString()] || 0,
        photos: safePhotos(p.photos),
        activities: actByProject[p._id.toString()] || [],
      })
    })

    const result = programs.map((g) => ({
      _id: g._id, title: g.title, description: g.description, category: g.category, status: g.status,
      startDate: g.startDate, endDate: g.endDate,
      organizer: g.organizer ? `${g.organizer.firstName} ${g.organizer.lastName}` : '',
      spent: spentProg[g._id.toString()] || 0,
      photos: safePhotos(g.photos),
      projects: projByProgram[g._id.toString()] || [],
    }))

    res.json({ programs: result })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
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
  getPublicPrograms,
}