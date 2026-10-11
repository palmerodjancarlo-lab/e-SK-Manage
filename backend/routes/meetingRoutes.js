const express     = require('express')
const router      = express.Router()
const ctrl        = require('../controllers/meetingController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

// IMPORTANT: /checkin must be declared BEFORE /:id routes
// otherwise Express might try to match 'checkin' as an :id param
router.post('/checkin',           protect, ctrl.checkIn)
router.get('/attendance-summary', protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.getAttendanceSummary)

router.get('/',                   protect, ctrl.getMeetings)
router.post('/',                  protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.createMeeting)

router.get('/:id',                protect, ctrl.getMeeting)
router.put('/:id',                protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.updateMeeting)
router.delete('/:id',             protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.deleteMeeting)
router.put('/:id/minutes',        protect, authorize('admin','sk_chairperson','sk_secretary'), ctrl.saveMinutes) // Secretary records minutes
router.put('/:id/rsvp',           protect, ctrl.rsvpMeeting)
router.put('/:id/volunteer',      protect, ctrl.volunteerMeeting)
router.put('/:id/attendance',     protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.updateAttendance)
router.post('/:id/generate-qr',   protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.generateQR)
router.put('/:id/deactivate-qr',  protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.deactivateQR)
router.post('/:id/mark-present',  protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.markPresent)       // member without a phone
router.delete('/:id/checkins/:userId', protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.removeCheckIn)
router.get('/:id/attendance-sheet', protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.getAttendanceSheet) // download / print (audit-logged)
router.get('/:id/checkins',       protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.getCheckIns)
router.get('/:id/volunteers',     protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.getVolunteers)
router.post('/:id/comments',      protect, ctrl.addComment)
router.delete('/:id/comments/:commentId', protect, ctrl.deleteComment)

module.exports = router