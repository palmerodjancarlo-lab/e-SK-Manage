const express   = require('express')
const router    = express.Router()
const ctrl      = require('../controllers/announcementController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

router.get('/',          protect, ctrl.getAnnouncements)
router.get('/:id',       protect, ctrl.getAnnouncement)
router.post('/',         protect, authorize('admin','sk_officer'), ctrl.createAnnouncement)
router.put('/:id',       protect, authorize('admin','sk_officer'), ctrl.updateAnnouncement)
router.delete('/:id',    protect, authorize('admin','sk_officer'), ctrl.deleteAnnouncement)
router.put('/:id/pin',   protect, authorize('admin','sk_officer'), ctrl.togglePin)

module.exports = router