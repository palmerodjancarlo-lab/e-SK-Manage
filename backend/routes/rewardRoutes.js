// routes/rewardRoutes.js
const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const { getRewards, createReward, updateReward, deleteReward, awardPoints } = require('../controllers/rewardController')

const SK_MANAGE = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

router.get('/',      protect, getRewards)                       // everyone can view rewards
router.post('/',     protect, authorize(...SK_MANAGE), createReward)
router.put('/:id',   protect, authorize(...SK_MANAGE), updateReward)
router.delete('/:id',protect, authorize(...SK_MANAGE), deleteReward)
router.post('/award-points', protect, authorize(...SK_MANAGE), awardPoints)

module.exports = router