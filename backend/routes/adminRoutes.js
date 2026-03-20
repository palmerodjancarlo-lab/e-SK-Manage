const express     = require('express')
const router      = express.Router()
const adminCtrl   = require('../controllers/adminController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

router.get('/users',            protect, authorize('admin'), adminCtrl.getUsers)
router.put('/users/:id/role',   protect, authorize('admin'), adminCtrl.updateRole)
router.put('/users/:id/toggle', protect, authorize('admin'), adminCtrl.toggleActive)
router.delete('/users/:id',     protect, authorize('admin'), adminCtrl.deleteUser)
router.get('/logs',             protect, authorize('admin'), adminCtrl.getAuditLogs)
router.get('/stats',            protect, authorize('admin'), adminCtrl.getStats)

module.exports = router