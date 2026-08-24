// controllers/financeController.js
// Manages all SK financial records
// Fund receipts + Expenses with full audit trail

const Fund     = require('../models/Fund')
const Expense  = require('../models/Expense')
const Activity = require('../models/Activity')
const Project  = require('../models/Project')
const Program  = require('../models/Program')
const AuditLog = require('../models/AuditLog')

// ── BALANCE HELPER ────────────────────────────────────────────────────────────
const getBalance = async () => {
  // Total funds received (not voided)
  const fundsResult = await Fund.aggregate([
    { $match: { isVoided: false } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ])
  const totalFunds = fundsResult[0]?.total || 0

  // Total approved expenses (not voided)
  const expResult = await Expense.aggregate([
    { $match: { status: 'approved', isVoided: false } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ])
  const totalExpenses = expResult[0]?.total || 0

  return {
    totalFunds,
    totalExpenses,
    balance: totalFunds - totalExpenses,
  }
}

// ── FUNDS (INCOME) ────────────────────────────────────────────────────────────

// GET /api/finance/funds
const getFunds = async (req, res) => {
  try {
    const funds = await Fund.find()
      .populate('recordedBy', 'firstName lastName role')
      .populate('voidedBy',   'firstName lastName role')
      .populate('program',    'title')
      .sort({ dateReceived: -1 })
    const balance = await getBalance()
    res.json({ funds, ...balance })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/finance/funds
// Only Chairperson records funds received
const recordFund = async (req, res) => {
  try {
    const {
      source, sourceType, amount, referenceNumber,
      dateReceived, program, purpose, notes, receiptPhoto,
    } = req.body

    if (!source || !amount || !dateReceived) {
      return res.status(400).json({ message: 'Source, amount, and date received are required.' })
    }

    const fund = await Fund.create({
      source, sourceType, amount, referenceNumber,
      dateReceived, program: program || null,
      purpose, notes,
      receiptPhoto: receiptPhoto || '',
      recordedBy: req.user._id,
    })

    await fund.populate('recordedBy', 'firstName lastName role')

    await AuditLog.create({
      user:    req.user._id,
      action:  'RECORD_FUND',
      details: `${req.user.firstName} ${req.user.lastName} recorded fund receipt: ₱${amount} from ${source} on ${dateReceived}`,
    })

    const balance = await getBalance()
    res.status(201).json({ message: 'Fund recorded successfully.', fund, ...balance })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/finance/funds/:id
// Edit fund — only before any expense is linked
// Saves full edit history
const editFund = async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id)
    if (!fund) return res.status(404).json({ message: 'Fund record not found.' })
    if (fund.isVoided) return res.status(400).json({ message: 'Cannot edit a voided fund record.' })

    // Save snapshot of old values before edit
    const oldValues = {
      source:          fund.source,
      amount:          fund.amount,
      referenceNumber: fund.referenceNumber,
      dateReceived:    fund.dateReceived,
      purpose:         fund.purpose,
      notes:           fund.notes,
    }

    // Build change description
    const changes = []
    if (req.body.amount && req.body.amount !== fund.amount)
      changes.push(`Amount: ₱${fund.amount} → ₱${req.body.amount}`)
    if (req.body.source && req.body.source !== fund.source)
      changes.push(`Source: "${fund.source}" → "${req.body.source}"`)

    // Apply updates
    Object.assign(fund, req.body)

    // Log the edit
    fund.editHistory.push({
      editedBy:  req.user._id,
      editedAt:  new Date(),
      oldValues,
      changes:   changes.join(', ') || 'Minor update',
    })

    await fund.save()

    await AuditLog.create({
      user:    req.user._id,
      action:  'EDIT_FUND',
      details: `${req.user.firstName} ${req.user.lastName} edited fund record ID:${fund._id}. Changes: ${changes.join(', ')}`,
    })

    res.json({ message: 'Fund record updated.', fund })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/finance/funds/:id/void
// Void a fund record — never deleted, just marked as voided
const voidFund = async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason) return res.status(400).json({ message: 'Void reason is required.' })

    const fund = await Fund.findById(req.params.id)
    if (!fund) return res.status(404).json({ message: 'Fund record not found.' })
    if (fund.isVoided) return res.status(400).json({ message: 'Already voided.' })

    fund.isVoided   = true
    fund.voidReason = reason
    fund.voidedBy   = req.user._id
    fund.voidedAt   = new Date()
    await fund.save()

    await AuditLog.create({
      user:    req.user._id,
      action:  'VOID_FUND',
      details: `${req.user.firstName} ${req.user.lastName} voided fund record ID:${fund._id}. Reason: ${reason}`,
    })

    res.json({ message: 'Fund record voided.', fund })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────

// GET /api/finance/expenses
const getExpenses = async (req, res) => {
  try {
    const { status, activity, project, program } = req.query
    const filter = {}
    if (status)   filter.status   = status
    if (activity) filter.activity = activity
    if (project)  filter.project  = project
    if (program)  filter.program  = program

    const expenses = await Expense.find(filter)
      .populate('recordedBy',  'firstName lastName role')
      .populate('approvedBy',  'firstName lastName role')
      .populate('rejectedBy',  'firstName lastName role')
      .populate('voidedBy',    'firstName lastName role')
      .populate('activity',    'title')
      .populate('project',     'title')
      .populate('program',     'title')
      .sort({ dateSpent: -1 })

    const balance = await getBalance()
    res.json({ expenses, ...balance })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/finance/expenses
// Treasurer or Chairperson records an expense
const recordExpense = async (req, res) => {
  try {
    const {
      title, description, category, amount,
      receiptNumber, receiptPhoto, receiptDate, vendor,
      dateSpent, activity, project, program, notes,
    } = req.body

    if (!title || !amount || !dateSpent) {
      return res.status(400).json({ message: 'Title, amount, and date spent are required.' })
    }

    // Check if expense would exceed available balance
    const balance = await getBalance()
    if (amount > balance.balance) {
      return res.status(400).json({
        message: `Insufficient funds. Available balance: ₱${balance.balance.toLocaleString()}. Expense amount: ₱${amount.toLocaleString()}.`
      })
    }

    const expense = await Expense.create({
      title, description, category, amount,
      receiptNumber: receiptNumber || '',
      receiptPhoto:  receiptPhoto  || '',
      receiptDate:   receiptDate   || dateSpent,
      vendor:        vendor        || '',
      dateSpent,
      activity: activity || null,
      project:  project  || null,
      program:  program  || null,
      notes:    notes    || '',
      status:     'pending',
      recordedBy: req.user._id,
    })

    await expense.populate([
      { path:'recordedBy', select:'firstName lastName role' },
      { path:'activity',   select:'title' },
      { path:'project',    select:'title' },
      { path:'program',    select:'title' },
    ])

    await AuditLog.create({
      user:    req.user._id,
      action:  'RECORD_EXPENSE',
      details: `${req.user.firstName} ${req.user.lastName} recorded expense: "${title}" ₱${amount} — Receipt #${receiptNumber || 'N/A'} from ${vendor || 'N/A'} on ${dateSpent}`,
    })

    res.status(201).json({ message: 'Expense recorded. Waiting for Chairperson approval.', expense })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/finance/expenses/:id/approve
// Only Chairperson can approve an expense
const approveExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
    if (!expense) return res.status(404).json({ message: 'Expense not found.' })
    if (expense.isVoided) return res.status(400).json({ message: 'Cannot approve a voided expense.' })
    if (expense.status === 'approved') return res.status(400).json({ message: 'Already approved.' })

    expense.status     = 'approved'
    expense.approvedBy = req.user._id
    expense.approvedAt = new Date()
    await expense.save()

    // Sync actual cost to activity
    if (expense.activity) {
      const actExpenses = await Expense.find({
        activity: expense.activity, status:'approved', isVoided:false
      })
      const total = actExpenses.reduce((sum,e) => sum + e.amount, 0)
      await Activity.findByIdAndUpdate(expense.activity, { actualCost: total })
    }

    await AuditLog.create({
      user:    req.user._id,
      action:  'APPROVE_EXPENSE',
      details: `${req.user.firstName} ${req.user.lastName} APPROVED expense: "${expense.title}" ₱${expense.amount}`,
    })

    res.json({ message: 'Expense approved.', expense })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/finance/expenses/:id/reject
// Chairperson rejects with reason
const rejectExpense = async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason) return res.status(400).json({ message: 'Rejection reason is required.' })

    const expense = await Expense.findById(req.params.id)
    if (!expense) return res.status(404).json({ message: 'Expense not found.' })
    if (expense.status === 'approved') return res.status(400).json({ message: 'Cannot reject an already approved expense.' })

    expense.status          = 'rejected'
    expense.rejectedBy      = req.user._id
    expense.rejectedAt      = new Date()
    expense.rejectionReason = reason
    await expense.save()

    await AuditLog.create({
      user:    req.user._id,
      action:  'REJECT_EXPENSE',
      details: `${req.user.firstName} ${req.user.lastName} REJECTED expense: "${expense.title}" ₱${expense.amount}. Reason: ${reason}`,
    })

    res.json({ message: 'Expense rejected.', expense })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/finance/expenses/:id/void
// Void expense — never deleted
const voidExpense = async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason) return res.status(400).json({ message: 'Void reason is required.' })

    const expense = await Expense.findById(req.params.id)
    if (!expense) return res.status(404).json({ message: 'Expense not found.' })
    if (expense.isVoided) return res.status(400).json({ message: 'Already voided.' })

    expense.isVoided   = true
    expense.voidReason = reason
    expense.voidedBy   = req.user._id
    expense.voidedAt   = new Date()
    expense.status     = 'voided'
    await expense.save()

    await AuditLog.create({
      user:    req.user._id,
      action:  'VOID_EXPENSE',
      details: `${req.user.firstName} ${req.user.lastName} VOIDED expense: "${expense.title}" ₱${expense.amount}. Reason: ${reason}`,
    })

    res.json({ message: 'Expense voided.', expense })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── REPORTS & BALANCE ─────────────────────────────────────────────────────────

// GET /api/finance/summary
// Full financial summary — total funds, total expenses, balance
const getSummary = async (req, res) => {
  try {
    const balance = await getBalance()

    // Breakdown by source type
    const fundsBySource = await Fund.aggregate([
      { $match: { isVoided:false } },
      { $group: { _id:'$sourceType', total:{ $sum:'$amount' }, count:{ $sum:1 } } }
    ])

    // Breakdown by category
    const expensesByCategory = await Expense.aggregate([
      { $match: { status:'approved', isVoided:false } },
      { $group: { _id:'$category', total:{ $sum:'$amount' }, count:{ $sum:1 } } }
    ])

    // Pending expenses waiting for approval
    const pendingCount = await Expense.countDocuments({ status:'pending', isVoided:false })
    const pendingTotal = await Expense.aggregate([
      { $match: { status:'pending', isVoided:false } },
      { $group: { _id:null, total:{ $sum:'$amount' } } }
    ])

    res.json({
      ...balance,
      pendingExpenses: {
        count: pendingCount,
        total: pendingTotal[0]?.total || 0,
      },
      fundsBySource,
      expensesByCategory,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/finance/ledger
// Full transaction ledger — every fund and expense in chronological order
const getLedger = async (req, res) => {
  try {
    const funds = await Fund.find({ isVoided:false })
      .populate('recordedBy','firstName lastName role')
      .lean()

    const expenses = await Expense.find({ status:'approved', isVoided:false })
      .populate('recordedBy','firstName lastName role')
      .populate('approvedBy','firstName lastName role')
      .populate('activity','title')
      .lean()

    // Combine and sort by date
    const ledger = [
      ...funds.map(f => ({ ...f, entryType:'fund', date: f.dateReceived })),
      ...expenses.map(e => ({ ...e, entryType:'expense', date: e.dateSpent })),
    ].sort((a,b) => new Date(a.date) - new Date(b.date))

    // Running balance
    let runningBalance = 0
    const ledgerWithBalance = ledger.map(entry => {
      if (entry.entryType === 'fund') {
        runningBalance += entry.amount
      } else {
        runningBalance -= entry.amount
      }
      return { ...entry, runningBalance }
    })

    res.json({ ledger: ledgerWithBalance })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  // Funds
  getFunds, recordFund, editFund, voidFund,
  // Expenses
  getExpenses, recordExpense, approveExpense, rejectExpense, voidExpense,
  // Reports
  getSummary, getLedger,
}