// routes/adminRoutes.js
const express  = require('express')
const router   = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const {
  getUsers, getUser, createSKAccount, bulkCreateSK, updateUser,
  toggleActive, resetPassword, deleteUser,
  getStats, getAuditLogs, verifyResidency,
} = require('../controllers/adminController')

const ADMIN = ['sk_chairperson','admin']

router.get('/users',              protect, authorize(...ADMIN), getUsers)
router.get('/users/:id',          protect, authorize(...ADMIN), getUser)
router.post('/create-sk',         protect, authorize(...ADMIN), createSKAccount)
router.post('/bulk-create-sk',    protect, authorize(...ADMIN), bulkCreateSK)

router.put('/users/:id',          protect, authorize(...ADMIN), updateUser)
router.put('/users/:id/toggle',   protect, authorize(...ADMIN), toggleActive)
router.put('/users/:id/reset-password', protect, authorize(...ADMIN), resetPassword)
router.put('/users/:id/verify',         protect, authorize(...ADMIN), verifyResidency)
router.delete('/users/:id',       protect, authorize(...ADMIN), deleteUser)
router.get('/stats',              protect, authorize(...ADMIN), getStats)
router.get('/logs',               protect, authorize(...ADMIN), getAuditLogs)

module.exports = router