// routes/budgetRoutes.js
const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { getProgramBreakdown, getBudgetOverview } = require('../controllers/budgetController')

// Any signed-in user can read the breakdown — this is the transparency view,
// so kabataan can see it too. (Editing still happens through programRoutes.)
router.get('/overview',     protect, getBudgetOverview)
router.get('/program/:id',  protect, getProgramBreakdown)

module.exports = router