const express     = require('express')
const router      = express.Router()
const annCtrl     = require('../controllers/announcementController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

router.get('/',         protect, annCtrl.getAnnouncements)
router.get('/:id',      protect, annCtrl.getAnnouncement)
router.post('/',        protect, authorize('admin','sk_officer'), annCtrl.createAnnouncement)
router.put('/:id',      protect, authorize('admin','sk_officer'), annCtrl.updateAnnouncement)
router.delete('/:id',   protect, authorize('admin','sk_officer'), annCtrl.deleteAnnouncement)
router.put('/:id/pin',  protect, authorize('admin','sk_officer'), annCtrl.togglePin)

module.exports = router