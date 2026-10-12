// routes/budgetRoutes.js
const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const { getProgramBreakdown, getBudgetOverview } = require('../controllers/budgetController')

// PPA budgets are for SK officers; kabataan see spending through /finance/summary and /programs/public
const SK_ALL = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

// Any signed-in user can read the breakdown — this is the transparency view,
// so kabataan can see it too. (Editing still happens through programRoutes.)
router.get('/overview',     protect, authorize(...SK_ALL), getBudgetOverview)
router.get('/program/:id',  protect, authorize(...SK_ALL), getProgramBreakdown)

module.exports = router