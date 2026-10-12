// routes/rewardRoutes.js
const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const { getRewards, createReward, updateReward, deleteReward, awardPoints } = require('../controllers/rewardController')

const {
  requestRedemption, myRedemptions, cancelRedemption, listRedemptions, claimRedemption, rejectRedemption,
} = require('../controllers/redemptionController')

// Rewards, point awards and reward pickups: SK Chairperson and SK Secretary only
const SK_MANAGE = ['admin','sk_chairperson','sk_secretary']

// Redemptions — named paths before /:id
router.get('/redemptions/mine',        protect, authorize('kabataan'), myRedemptions)
router.put('/redemptions/:id/cancel',  protect, authorize('kabataan'), cancelRedemption)
router.get('/redemptions',             protect, authorize(...SK_MANAGE), listRedemptions)
router.put('/redemptions/:id/claim',   protect, authorize(...SK_MANAGE), claimRedemption)
router.put('/redemptions/:id/reject',  protect, authorize(...SK_MANAGE), rejectRedemption)
router.post('/:id/redeem',             protect, authorize('kabataan'), requestRedemption)

router.get('/',      protect, getRewards)                       // everyone can view rewards
router.post('/',     protect, authorize(...SK_MANAGE), createReward)
router.put('/:id',   protect, authorize(...SK_MANAGE), updateReward)
router.delete('/:id',protect, authorize(...SK_MANAGE), deleteReward)
router.post('/award-points', protect, authorize(...SK_MANAGE), awardPoints)

module.exports = router