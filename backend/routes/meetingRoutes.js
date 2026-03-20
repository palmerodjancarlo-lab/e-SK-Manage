const express     = require('express')
const router      = express.Router()
const meetCtrl    = require('../controllers/meetingController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

router.get('/',                 protect, meetCtrl.getMeetings)
router.get('/:id',              protect, meetCtrl.getMeeting)
router.post('/',                protect, authorize('admin','sk_officer'), meetCtrl.createMeeting)
router.put('/:id',              protect, authorize('admin','sk_officer'), meetCtrl.updateMeeting)
router.delete('/:id',           protect, authorize('admin','sk_officer'), meetCtrl.deleteMeeting)
router.put('/:id/rsvp',         protect, meetCtrl.rsvpMeeting)
router.put('/:id/attendance',   protect, authorize('admin','sk_officer'), meetCtrl.updateAttendance)

module.exports = router