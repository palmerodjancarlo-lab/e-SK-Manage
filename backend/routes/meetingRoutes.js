const express     = require('express')
const router      = express.Router()
const ctrl        = require('../controllers/meetingController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

// IMPORTANT: /checkin must be declared BEFORE /:id routes
// otherwise Express might try to match 'checkin' as an :id param
router.post('/checkin',           protect, ctrl.checkIn)

router.get('/',                   protect, ctrl.getMeetings)
router.post('/',                  protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.createMeeting)

router.get('/:id',                protect, ctrl.getMeeting)
router.put('/:id',                protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.updateMeeting)
router.delete('/:id',             protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.deleteMeeting)
router.put('/:id/rsvp',           protect, ctrl.rsvpMeeting)
router.put('/:id/attendance',     protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.updateAttendance)
router.post('/:id/generate-qr',   protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.generateQR)
router.put('/:id/deactivate-qr',  protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.deactivateQR)
router.get('/:id/checkins',       protect, authorize('admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'), ctrl.getCheckIns)
router.post('/:id/comments',      protect, ctrl.addComment)
router.delete('/:id/comments/:commentId', protect, ctrl.deleteComment)

module.exports = router