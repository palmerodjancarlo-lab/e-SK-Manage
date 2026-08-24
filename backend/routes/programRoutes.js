// routes/programRoutes.js
const express  = require('express')
const router   = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const {
  getPrograms, getProgram, createProgram, updateProgram, deleteProgram,
  getProjects, createProject, updateProject, deleteProject,
  getActivities, createActivity, updateActivity,
  recordAttendance, getAttendance,
  addPhoto, deletePhoto,
} = require('../controllers/programController')

// Who can manage programs/projects/activities
const MANAGE  = ['admin','sk_chairperson']
const SK_ALL  = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
const ATTEND  = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

// ── Programs
router.get('/',      protect, getPrograms)       // all authenticated
router.get('/:id',   protect, getProgram)
router.post('/',     protect, authorize(...MANAGE), createProgram)
router.put('/:id',   protect, authorize(...MANAGE), updateProgram)
router.delete('/:id',protect, authorize(...MANAGE), deleteProgram)

// ── Projects under a program
router.get('/:programId/projects',   protect, getProjects)
router.post('/:programId/projects',  protect, authorize(...MANAGE), createProject)
router.put('/projects/:id',          protect, authorize(...MANAGE), updateProject)
router.delete('/projects/:id',       protect, authorize(...MANAGE), deleteProject)

// ── Activities under a project
router.get('/projects/:projectId/activities',  protect, getActivities)
router.post('/projects/:projectId/activities', protect, authorize(...MANAGE), createActivity)
router.put('/activities/:id',                  protect, authorize(...MANAGE), updateActivity)

// ── Attendance (SK officials record attendance, not kabataan)
router.get('/activities/:id/attendance',  protect, authorize(...ATTEND), getAttendance)
router.post('/activities/:id/attendance', protect, authorize(...ATTEND), recordAttendance)


// ── PPA Photos (Chairperson, Secretary can add — proof/progress) ──
const PHOTO_ROLES = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
router.post('/:type/:id/photos',            protect, authorize(...PHOTO_ROLES), addPhoto)
router.delete('/:type/:id/photos/:photoId', protect, authorize(...PHOTO_ROLES), deletePhoto)

module.exports = router