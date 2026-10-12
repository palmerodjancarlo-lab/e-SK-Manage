// routes/programRoutes.js
const express  = require('express')
const router   = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const {
  getPrograms, getProgram, createProgram, updateProgram, deleteProgram,
  getProjects, createProject, updateProject, deleteProject,
  getActivities, createActivity, updateActivity, deleteActivity,
  recordAttendance, getAttendance,
  addPhoto, deletePhoto, getPublicPrograms,
  addProgressUpdate, deleteProgressUpdate, addDocument, deleteDocument,
} = require('../controllers/programController')

// Who can manage programs/projects/activities
const MANAGE  = ['admin','sk_chairperson']
const SK_ALL  = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
const ATTEND  = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

// ── Public PPA (no login) — used by the landing page AND kabataan.
// MUST be declared before '/:id' so 'public' isn't matched as an :id.
router.get('/public', getPublicPrograms)

// ── Programs
router.get('/',      protect, authorize(...SK_ALL), getPrograms)       // officers; kabataan use /public (no budgets)
router.get('/:id',   protect, authorize(...SK_ALL), getProgram)
router.post('/',     protect, authorize(...MANAGE), createProgram)
router.put('/:id',   protect, authorize(...MANAGE), updateProgram)
router.delete('/:id',protect, authorize(...MANAGE), deleteProgram)

// ── Progress updates + supporting documents (Chairperson manages programs)
router.post('/:id/updates',                protect, authorize(...MANAGE), addProgressUpdate)
router.delete('/:id/updates/:updateId',    protect, authorize(...MANAGE), deleteProgressUpdate)
router.post('/:id/documents',              protect, authorize(...MANAGE), addDocument)
router.delete('/:id/documents/:docId',     protect, authorize(...MANAGE), deleteDocument)

// ── Projects under a program
router.get('/:programId/projects',   protect, authorize(...SK_ALL), getProjects)
router.post('/:programId/projects',  protect, authorize(...MANAGE), createProject)
router.put('/projects/:id',          protect, authorize(...MANAGE), updateProject)
router.delete('/projects/:id',       protect, authorize(...MANAGE), deleteProject)

// ── Activities under a project
router.get('/projects/:projectId/activities',  protect, authorize(...SK_ALL), getActivities)
router.post('/projects/:projectId/activities', protect, authorize(...MANAGE), createActivity)
router.put('/activities/:id',                  protect, authorize(...MANAGE), updateActivity)
router.delete('/activities/:id',               protect, authorize(...MANAGE), deleteActivity)

// ── Attendance (SK officials record attendance, not kabataan)
router.get('/activities/:id/attendance',  protect, authorize(...ATTEND), getAttendance)
router.post('/activities/:id/attendance', protect, authorize(...ATTEND), recordAttendance)

// ── PPA Photos (Chairperson, Secretary can add — proof/progress) ──
const PHOTO_ROLES = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
router.post('/:type/:id/photos',            protect, authorize(...PHOTO_ROLES), addPhoto)
router.delete('/:type/:id/photos/:photoId', protect, authorize(...PHOTO_ROLES), deletePhoto)

module.exports = router