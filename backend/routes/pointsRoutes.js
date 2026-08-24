const express   = require('express')
const router    = express.Router()
const ctrl      = require('../controllers/pointsController')
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')

const SK_AWARD = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

// Named routes before parameterized ones
router.get('/my',          protect, ctrl.getMyPoints)
router.get('/history',     protect, ctrl.getHistory)
router.get('/leaderboard', protect, ctrl.getLeaderboard)
router.post('/award',      protect, authorize(...SK_AWARD), ctrl.awardPoints)
router.post('/bulk-award', protect, authorize(...SK_AWARD), ctrl.bulkAward)

module.exports = router