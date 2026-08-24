// routes/financeRoutes.js
const express  = require('express')
const router   = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const {
  getFunds, recordFund, editFund, voidFund,
  getExpenses, recordExpense, approveExpense, rejectExpense, voidExpense,
  getSummary, getLedger,
} = require('../controllers/financeController')

// Role groups
const CHAIRPERSON = ['admin','sk_chairperson']
const TREASURER   = ['admin','sk_chairperson','sk_treasurer']
const VIEW_ALL    = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
const TRANSPARENCY = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad','kabataan'] // kabataan can VIEW for transparency

// ── Funds (Income)
router.get('/funds',          protect, authorize(...TRANSPARENCY), getFunds)
router.post('/funds',         protect, authorize(...CHAIRPERSON), recordFund)    // Chairperson records
router.put('/funds/:id',      protect, authorize(...CHAIRPERSON), editFund)      // Chairperson edits
router.put('/funds/:id/void', protect, authorize(...CHAIRPERSON), voidFund)      // Chairperson voids

// ── Expenses
router.get('/expenses',              protect, authorize(...VIEW_ALL),  getExpenses)
router.post('/expenses',             protect, authorize(...TREASURER), recordExpense)   // Treasurer or Chairperson records
router.put('/expenses/:id/approve',  protect, authorize(...CHAIRPERSON), approveExpense) // Chairperson approves
router.put('/expenses/:id/reject',   protect, authorize(...CHAIRPERSON), rejectExpense)  // Chairperson rejects
router.put('/expenses/:id/void',     protect, authorize(...CHAIRPERSON), voidExpense)    // Chairperson voids

// ── Reports
router.get('/summary', protect, authorize(...TRANSPARENCY), getSummary)
router.get('/ledger',  protect, authorize(...VIEW_ALL), getLedger)

module.exports = router