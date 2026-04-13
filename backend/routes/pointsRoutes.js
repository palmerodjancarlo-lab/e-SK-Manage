const express     = require('express')
const router      = express.Router()
const ctrl        = require('../controllers/pointsController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

// IMPORTANT: specific routes before parameterized ones
router.get('/my',          protect, ctrl.getMyPoints)
router.get('/history',     protect, ctrl.getHistory)      // points history for logged-in user
router.get('/leaderboard', protect, ctrl.getLeaderboard)
router.post('/award',      protect, authorize('admin','sk_officer'), ctrl.awardPoints)

module.exports = router