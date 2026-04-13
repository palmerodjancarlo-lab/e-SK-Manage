// adminRoutes.js
const express   = require('express')
const router    = express.Router()
const ctrl      = require('../controllers/adminController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

// Any logged-in user can view directory
router.get('/users', protect, ctrl.getUsers)

// SK Application review — admin only
router.get('/sk-applications',              protect, authorize('admin'), ctrl.getSKApplications)
router.put('/sk-applications/:id/approve',  protect, authorize('admin'), ctrl.approveSKApplication)
router.put('/sk-applications/:id/reject',   protect, authorize('admin'), ctrl.rejectSKApplication)

// User management — admin only
router.post('/create-user',     protect, authorize('admin'), ctrl.createUser)
router.put('/users/:id/role',   protect, authorize('admin'), ctrl.updateRole)
router.put('/users/:id/toggle', protect, authorize('admin'), ctrl.toggleActive)
router.delete('/users/:id',     protect, authorize('admin'), ctrl.deleteUser)
router.get('/logs',             protect, authorize('admin'), ctrl.getAuditLogs)
router.get('/stats',            protect, authorize('admin'), ctrl.getStats)

module.exports = router