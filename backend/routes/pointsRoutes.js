const express     = require('express')
const router      = express.Router()
const pointsCtrl  = require('../controllers/pointsController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

router.get('/my',          protect, pointsCtrl.getMyPoints)
router.get('/leaderboard', protect, pointsCtrl.getLeaderboard)
router.post('/award',      protect, authorize('admin','sk_officer'), pointsCtrl.awardPoints)
router.post('/redeem',     protect, pointsCtrl.redeemPoints)

module.exports = router