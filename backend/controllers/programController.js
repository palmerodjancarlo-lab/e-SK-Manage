// controllers/programController.js
// Manages Programs (umbrella), Projects (under program), Activities (under project)
// Budget rolls up: Activity actualCost → Project totalActivityCost → Program totalProjectCost

const Program = require('../models/Program')
const serverError = require('../utils/serverError')
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

const pick = require('../utils/pick')
const PROJECT_EDITABLE = ['title', 'description', 'status', 'startDate', 'endDate', 'adjustedEndDate',
  'coordinator', 'allocatedBudget', 'completionReport', 'notes']
const ACTIVITY_EDITABLE = ['title', 'description', 'type', 'status', 'startDate', 'endDate', 'venue',
  'estimatedCost', 'actualCost', 'pointsPerDay', 'notes']

// Programs the SK has published to kabataan (missing flag = published, for older records)
const VISIBLE = { showToKabataan: { $ne: false } }

// GET /api/programs
const getPrograms = async (req, res) => {
  try {
    const programs = await Program.find(req.user?.role === 'kabataan' ? VISIBLE : {})
      .populate('organizer', 'firstName lastName position')
      .populate('progressUpdates.postedBy', 'firstName lastName role')
      .populate('documents.uploadedBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
    res.json({ programs })
  } catch (error) {
    serverError(res, error)
  }
}

// GET /api/programs/:id
const getProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate('organizer', 'firstName lastName position')
    if (!program || (req.user?.role === 'kabataan' && program.showToKabataan === false)) {
      return res.status(404).json({ message: 'Program not found' })
    }

    const projects = await Project.find({ program: program._id })
      .populate('coordinator', 'firstName lastName')

    res.json({ program, projects })
  } catch (error) {
    serverError(res, error)
  }
}

// POST /api/programs
const createProgram = async (req, res) => {
  try {
    const {
      title, description, category, status, startDate, endDate, municipality, barangay, fundSources, notes,
      fiscalYear, area, referenceCode, centerOfParticipation, objective, performanceIndicator,
      expectedResults, dateOfImplementation, personResponsible, targets, budget,
      targetBeneficiaries, beneficiaryCount, showToKabataan,
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
      targetBeneficiaries, beneficiaryCount: beneficiaryCount === '' ? null : beneficiaryCount,
      showToKabataan: showToKabataan !== false,
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
    serverError(res, error)
  }
}

// PUT /api/programs/:id
const updateProgram = async (req, res) => {
  try {
    // Progress updates, documents and photos have their own endpoints; organizer is fixed
    // eslint-disable-next-line no-unused-vars
    const { fundSources, budget, progressUpdates, documents, organizer, photos, ...rest } = req.body
    let update = { ...rest }
    if (update.beneficiaryCount === '') update.beneficiaryCount = null

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
    serverError(res, error)
  }
}

// DELETE /api/programs/:id
// Deleting a program also removes its linked announcement(s).
const deleteProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id)
    if (!program) return res.status(404).json({ message: 'Program not found' })
    await Announcement.deleteMany({ sourceType: 'program', sourceId: req.params.id }).catch(() => {})
    // Its projects and activities go with it (expenses stay — they're the money trail)
    const [acts, projs] = await Promise.all([
      Activity.deleteMany({ program: program._id }),
      Project.deleteMany({ program: program._id }),
    ])
    await AuditLog.create({ user: req.user._id, action: 'DELETE_PROGRAM', details: `Deleted Program: ${program.title} (with ${projs.deletedCount || 0} project(s), ${acts.deletedCount || 0} activit${acts.deletedCount === 1 ? 'y' : 'ies'})` })
    res.json({ message: 'Program deleted.' })
  } catch (error) {
    serverError(res, error)
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
    serverError(res, error)
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
    serverError(res, error)
  }
}

// PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, pick(req.body, PROJECT_EDITABLE), { new: true, runValidators: true })
    if (!project) return res.status(404).json({ message: 'Project not found' })

    await syncProgramCost(project.program)

    await AuditLog.create({ user: req.user._id, action: 'UPDATE_PROJECT', details: `Updated Project: ${project.title}` })
    res.json({ message: 'Project updated.', project })
  } catch (error) {
    serverError(res, error)
  }
}

// DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    await Activity.deleteMany({ project: project._id })
    await syncProgramCost(project.program)
    await AuditLog.create({ user: req.user._id, action: 'DELETE_PROJECT', details: `Deleted Project: ${project.title}` })
    res.json({ message: 'Project deleted.' })
  } catch (error) {
    serverError(res, error)
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
    serverError(res, error)
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
    serverError(res, error)
  }
}

// DELETE /api/programs/activities/:id  (points already earned stay in members' history)
const deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id)
    if (!activity) return res.status(404).json({ message: 'Activity not found' })
    await syncProjectCost(activity.project)
    const project = await Project.findById(activity.project)
    if (project) await syncProgramCost(project.program)
    await AuditLog.create({ user: req.user._id, action: 'DELETE_ACTIVITY', details: `Deleted Activity: ${activity.title}` })
    res.json({ message: 'Activity deleted.' })
  } catch (error) {
    serverError(res, error)
  }
}

// PUT /api/activities/:id
const updateActivity = async (req, res) => {
  try {
    // findById + save so the pre-save hook recomputes totalDays / totalPoints
    const activity = await Activity.findById(req.params.id)
    if (activity) {
      Object.assign(activity, pick(req.body, ACTIVITY_EDITABLE))
      await activity.save()
    }
    if (!activity) return res.status(404).json({ message: 'Activity not found' })

    await syncProjectCost(activity.project)
    const project = await Project.findById(activity.project)
    if (project) await syncProgramCost(project.program)

    await AuditLog.create({ user: req.user._id, action: 'UPDATE_ACTIVITY', details: `Updated Activity: ${activity.title}` })
    res.json({ message: 'Activity updated.', activity })
  } catch (error) {
    serverError(res, error)
  }
}

// ── ATTENDANCE & POINTS (Prorated + Priority bonus) ─────────────────────────────

// POST /api/activities/:id/attendance
// Record attendance for a kabataan — points are prorated AND priority-adjusted
const recordAttendance = async (req, res) => {
  try {
    const userId = typeof req.body.userId === 'string' ? req.body.userId : ''
    const daysAttended = Number(req.body.daysAttended)
    if (!userId || !Number.isInteger(daysAttended) || daysAttended < 0) {
      return res.status(400).json({ message: 'Choose a member and enter the number of days attended.' })
    }

    const activity = await Activity.findById(req.params.id)
    if (!activity) return res.status(404).json({ message: 'Activity not found' })
    if (daysAttended > activity.totalDays) return res.status(400).json({ message: `Cannot exceed total days (${activity.totalDays}).` })

    // The member must be an active kabataan. Attendance counts either way; if their
    // residency isn't verified yet the points are held and released on verification.
    const member = await User.findById(userId)
    if (!member) return res.status(404).json({ message: 'Member not found.' })
    const elig = pointsEligibility(member)
    const unverifiedMember = member.role === 'kabataan' && member.isActive !== false && !member.idVerified
    if (!elig.eligible && !unverifiedMember) return res.status(400).json({ message: elig.reason })
    const held = !elig.eligible

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
      existing.daysAttended = daysAttended
      existing.pointsEarned = finalPoints
      existing.recordedBy = req.user._id
      existing.recordedAt = new Date()
      await activity.save()

      // Keep the points ledger (source of truth for balances) in step with the edit.
      // Points already counted stay counted; otherwise they're held while unverified.
      // A ledger row needs at least 1 point, so 0 points means no row.
      const row = await Points.findOne({ user: userId, activity: activity._id, type: { $in: ['earned', 'held'] } })
      const wasCounted = row?.type === 'earned'
      const nowCounted = wasCounted || !held
      const diff = (nowCounted ? finalPoints : 0) - (wasCounted ? row.pointsEarned : 0)
      if (diff) await User.findByIdAndUpdate(userId, { $inc: { points: diff } })
      if (finalPoints > 0) {
        await Points.findOneAndUpdate(
          { user: userId, activity: activity._id, type: { $in: ['earned', 'held'] } },
          { pointsEarned: finalPoints, reason, type: nowCounted ? 'earned' : 'held' },
          { upsert: true, setDefaultsOnInsert: true },
        )
      } else if (row) await Points.deleteOne({ _id: row._id })

      return res.json({
        message: 'Attendance updated.',
        pointsEarned: finalPoints, basePoints, pointsHeld: held && !wasCounted,
        bonusApplied: applied.map(a => a.label),
        daysAttended,
      })
    }

    activity.attendance.push({ user: userId, daysAttended, pointsEarned: finalPoints, recordedBy: req.user._id })
    await activity.save()

    if (!held) await User.findByIdAndUpdate(userId, { $inc: { points: finalPoints } })

    if (finalPoints > 0) {
      await Points.create({
        user: userId,
        activity: activity._id,
        pointsEarned: finalPoints, type: held ? 'held' : 'earned',
        reason,
      })
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'RECORD_ATTENDANCE',
      details: `Recorded attendance for activity: ${activity.title} — ${member.firstName} ${member.lastName} earned ${finalPoints} points (${daysAttended}/${activity.totalDays} days${applied.length ? ', priority bonus applied' : ''}${held && finalPoints ? ', held until residency is verified' : ''})`,
    })

    res.status(201).json({
      message: 'Attendance recorded.',
      pointsEarned: finalPoints, basePoints, pointsHeld: held && finalPoints > 0,
      bonusApplied: applied.map(a => a.label),
      daysAttended, totalDays: activity.totalDays,
    })
  } catch (error) {
    serverError(res, error)
  }
}

// GET /api/activities/:id/attendance
const getAttendance = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('attendance.user', 'firstName lastName barangay purok sex birthDate idVerified')
      .populate('project', 'title')
      .populate('program', 'title')
    if (!activity) return res.status(404).json({ message: 'Activity not found' })
    // ?export=1 — the officer is downloading/printing the sheet (personal data → audit trail)
    if (req.query.export) {
      await AuditLog.create({
        user: req.user._id, action: 'EXPORT_ATTENDANCE',
        details: `${req.user.firstName} ${req.user.lastName} downloaded the attendance of activity: ${activity.title}`,
      }).catch(() => {})
    }
    res.json({
      attendance: activity.attendance, totalDays: activity.totalDays, totalPoints: activity.totalPoints,
      activity: { _id: activity._id, title: activity.title, type: activity.type, startDate: activity.startDate, endDate: activity.endDate, venue: activity.venue || '', project: activity.project?.title || '', program: activity.program?.title || '' },
    })
  } catch (error) {
    serverError(res, error)
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
  } catch (e) { serverError(res, e) }
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
  } catch (e) { serverError(res, e) }
}


// GET /api/programs/public
// Kabataan-safe PPA tree: Program → Project → Activity with photos, status,
// and "spent" (approved expenses) rolled up. No planned/allocated budget is exposed.
// ── PROGRESS UPDATES & DOCUMENTS ─────────────────────────────────────────────
const STATUSES = ['planned', 'ongoing', 'completed', 'cancelled']

// POST /api/programs/:id/updates  { note, progress?, status? }
const addProgressUpdate = async (req, res) => {
  try {
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : ''
    if (!note) return res.status(400).json({ message: 'Write what happened.' })
    const raw = req.body.progress
    const progress = raw === '' || raw === null || raw === undefined ? null : Math.round(Number(raw))
    if (progress !== null && !(progress >= 0 && progress <= 100)) return res.status(400).json({ message: 'Progress must be 0–100%.' })
    const status = STATUSES.includes(req.body.status) ? req.body.status : ''

    const program = await Program.findById(req.params.id)
    if (!program) return res.status(404).json({ message: 'Program not found' })
    program.progressUpdates.push({ note, progress, status, postedBy: req.user._id, postedAt: new Date() })
    if (status) program.status = status
    await program.save()

    await AuditLog.create({ user: req.user._id, action: 'PROGRAM_UPDATE', details: `Progress update on "${program.title}"${progress !== null ? ` (${progress}%)` : ''}${status ? ` — status: ${status}` : ''}` })
    res.status(201).json({ message: 'Update posted.', program })
  } catch (error) {
    serverError(res, error)
  }
}

// DELETE /api/programs/:id/updates/:updateId
const deleteProgressUpdate = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
    if (!program) return res.status(404).json({ message: 'Program not found' })
    const u = program.progressUpdates.id(req.params.updateId)
    if (!u) return res.status(404).json({ message: 'Update not found' })
    u.deleteOne()
    await program.save()
    await AuditLog.create({ user: req.user._id, action: 'DELETE_PROGRAM_UPDATE', details: `Removed a progress update from "${program.title}": ${u.note.slice(0, 80)}` })
    res.json({ message: 'Update removed.', program })
  } catch (error) {
    serverError(res, error)
  }
}

// POST /api/programs/:id/documents  { name, url }  (url from /upload/document)
const addDocument = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 120) : ''
    const url = typeof req.body.url === 'string' ? req.body.url.trim() : ''
    if (!name || !/^https:\/\//.test(url)) return res.status(400).json({ message: 'A file and a name are required.' })
    const program = await Program.findById(req.params.id)
    if (!program) return res.status(404).json({ message: 'Program not found' })
    program.documents.push({ name, url, uploadedBy: req.user._id, uploadedAt: new Date() })
    await program.save()
    await AuditLog.create({ user: req.user._id, action: 'ADD_PROGRAM_DOCUMENT', details: `Attached "${name}" to "${program.title}"` })
    res.status(201).json({ message: 'Document attached.', program })
  } catch (error) {
    serverError(res, error)
  }
}

// DELETE /api/programs/:id/documents/:docId
const deleteDocument = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
    if (!program) return res.status(404).json({ message: 'Program not found' })
    const d = program.documents.id(req.params.docId)
    if (!d) return res.status(404).json({ message: 'Document not found' })
    d.deleteOne()
    await program.save()
    await AuditLog.create({ user: req.user._id, action: 'DELETE_PROGRAM_DOCUMENT', details: `Removed "${d.name}" from "${program.title}"` })
    res.json({ message: 'Document removed.', program })
  } catch (error) {
    serverError(res, error)
  }
}

const getPublicPrograms = async (req, res) => {
  try {
    const [programs, projects, activities] = await Promise.all([
      Program.find(VISIBLE).populate('organizer', 'firstName lastName').sort({ createdAt: -1 }).lean(),
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
      targetBeneficiaries: g.targetBeneficiaries || '', beneficiaryCount: g.beneficiaryCount ?? null,
      // progress log, newest first (documents stay with the officers)
      updates: (g.progressUpdates || []).map((u) => ({ _id: u._id, note: u.note, progress: u.progress, status: u.status, postedAt: u.postedAt })).reverse(),
      spent: spentProg[g._id.toString()] || 0,
      photos: safePhotos(g.photos),
      projects: projByProgram[g._id.toString()] || [],
    }))

    res.json({ programs: result })
  } catch (e) {
    serverError(res, e)
  }
}

module.exports = {
  // Programs
  getPrograms, getProgram, createProgram, updateProgram, deleteProgram,
  // Projects
  getProjects, createProject, updateProject, deleteProject,
  // Activities
  getActivities, createActivity, updateActivity, deleteActivity,
  // Attendance
  recordAttendance, getAttendance,
  addPhoto, deletePhoto,
  addProgressUpdate, deleteProgressUpdate, addDocument, deleteDocument,
  getPublicPrograms,
}