// routes/notificationRoutes.js — any signed-in user, own notifications only
const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { getMyNotifications, markRead, markAllRead } = require('../controllers/notificationController')

router.get('/',             protect, getMyNotifications)
router.put('/read-all',     protect, markAllRead)
router.put('/:id/read',     protect, markRead)

module.exports = router
