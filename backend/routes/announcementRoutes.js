const express   = require('express')
const router    = express.Router()
const ctrl      = require('../controllers/announcementController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

// Who can manage announcements: Chairperson + Secretary (per SK duties)
// Admin included for oversight
const MANAGE = ['admin', 'sk_chairperson', 'sk_secretary']

router.get('/',          protect, ctrl.getAnnouncements)
router.get('/:id',       protect, ctrl.getAnnouncement)
router.post('/',         protect, authorize(...MANAGE), ctrl.createAnnouncement)
router.put('/:id',       protect, authorize(...MANAGE), ctrl.updateAnnouncement)
router.delete('/:id',    protect, authorize(...MANAGE), ctrl.deleteAnnouncement)
router.put('/:id/pin',   protect, authorize(...MANAGE), ctrl.togglePin)

module.exports = router