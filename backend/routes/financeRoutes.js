// routes/financeRoutes.js
const express  = require('express')
const router   = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const {
  getFunds, recordFund, editFund, voidFund,
  getExpenses, recordExpense, approveExpense, rejectExpense, voidExpense, linkExpensePpa,
  getSummary, getLedger, setPublishedBudget,
} = require('../controllers/financeController')
const {
  getAbyipPrefill, getCbydpPrefill, getFinancialReportPrefill,
  listReports, getReport, saveReport, updateReport, deleteReport,
} = require('../controllers/reportController')

// Role groups
const CHAIRPERSON = ['admin','sk_chairperson']
const TREASURER   = ['admin','sk_chairperson','sk_treasurer']
const VIEW_ALL    = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
const TRANSPARENCY = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad','kabataan'] // kabataan can VIEW summary (utilized only)

// ── Funds (Income) — kabataan NOT included (raw income records are not public)
router.get('/funds',          protect, authorize(...VIEW_ALL),  getFunds)
router.post('/funds',         protect, authorize(...CHAIRPERSON), recordFund)    // Chairperson records
router.put('/funds/:id',      protect, authorize(...CHAIRPERSON), editFund)      // Chairperson edits
router.put('/funds/:id/void', protect, authorize(...CHAIRPERSON), voidFund)      // Chairperson voids

// ── Expenses
router.get('/expenses',              protect, authorize(...VIEW_ALL),  getExpenses)
router.post('/expenses',             protect, authorize(...TREASURER), recordExpense)   // Treasurer or Chairperson records
router.put('/expenses/:id/approve',  protect, authorize(...CHAIRPERSON), approveExpense) // Chairperson approves
router.put('/expenses/:id/reject',   protect, authorize(...CHAIRPERSON), rejectExpense)  // Chairperson rejects
router.put('/expenses/:id/void',     protect, authorize(...CHAIRPERSON), voidExpense)    // Chairperson voids
router.put('/expenses/:id/ppa',      protect, authorize(...CHAIRPERSON), linkExpensePpa) // Chairperson links to a PPA

// ── Summary / Ledger
// Summary stays open to kabataan, but getSummary returns a stripped "utilized only" view for them
router.get('/summary', protect, authorize(...TRANSPARENCY), getSummary)
router.get('/ledger',  protect, authorize(...VIEW_ALL), getLedger)
router.put('/published-budget', protect, authorize(...CHAIRPERSON), setPublishedBudget) // what kabataan see

// ── Reports (ABYIP / CBYDP / Financial report — stored type 'accomplishment')
router.get('/reports/abyip/prefill',          protect, authorize(...VIEW_ALL),   getAbyipPrefill)          // must precede /reports/:id
router.get('/reports/cbydp/prefill',          protect, authorize(...VIEW_ALL),   getCbydpPrefill)
router.get('/reports/financial/prefill',      protect, authorize(...VIEW_ALL),   getFinancialReportPrefill)
router.get('/reports/accomplishment/prefill', protect, authorize(...VIEW_ALL),   getFinancialReportPrefill) // old path
router.get('/reports',                        protect, authorize(...VIEW_ALL),   listReports)
router.get('/reports/:id',                    protect, authorize(...VIEW_ALL),   getReport)
router.post('/reports',                       protect, authorize(...TREASURER),  saveReport)
router.put('/reports/:id',                    protect, authorize(...TREASURER),  updateReport)
router.delete('/reports/:id',                 protect, authorize(...CHAIRPERSON), deleteReport)

module.exports = router