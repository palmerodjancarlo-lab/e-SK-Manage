// controllers/financeController.js
// Manages all SK financial records
// Fund receipts + Expenses with full audit trail

const Fund = require('../models/Fund')
const serverError = require('../utils/serverError')
const Expense = require('../models/Expense')
const Activity = require('../models/Activity')
const Project = require('../models/Project')
const Program = require('../models/Program')
const AuditLog = require('../models/AuditLog')
const Setting = require('../models/Setting')
const mongoose = require('mongoose')

// Which PPA an expense belongs to. The most specific pick wins and fills in its parents
// (activity → its project and program, project → its program), so Budget Utilization
// always rolls the expense up to the right program. Returns { program, project, activity }
// (null where not set) or { error }.
const resolvePpa = async ({ program, project, activity } = {}) => {
  const id = (v) => (v && mongoose.Types.ObjectId.isValid(String(v)) ? String(v) : null)
  if (id(activity)) {
    const a = await Activity.findById(activity).select('project program')
    if (!a) return { error: 'That activity no longer exists.' }
    return { activity: a._id, project: a.project || null, program: a.program || null }
  }
  if (id(project)) {
    const p = await Project.findById(project).select('program')
    if (!p) return { error: 'That project no longer exists.' }
    return { activity: null, project: p._id, program: p.program || null }
  }
  if (id(program)) {
    const g = await Program.findById(program).select('_id')
    if (!g) return { error: 'That program no longer exists.' }
    return { activity: null, project: null, program: g._id }
  }
  return { activity: null, project: null, program: null }
}
const pick = require('../utils/pick')
const FUND_EDITABLE = ['source', 'sourceType', 'amount', 'referenceNumber', 'receiptPhoto', 'dateReceived', 'program', 'purpose', 'notes']

// The single settings row holds the budget figure published to kabataan.
const getSettings = async () => (await Setting.findOne({ key: 'site' })) || Setting.create({ key: 'site' })
const publishedView = (p) => (p && p.amount != null
  ? { amount: p.amount, label: p.label || '', updatedAt: p.updatedAt }
  : null)

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
      .populate('voidedBy', 'firstName lastName role')
      .populate('program', 'title')
      .sort({ dateReceived: -1 })
    const balance = await getBalance()
    res.json({ funds, ...balance })
  } catch (error) {
    serverError(res, error)
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
      user: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'RECORD_FUND',
      details: `${req.user.firstName} ${req.user.lastName} recorded fund receipt: ₱${amount} from ${source} on ${dateReceived}`,
    })

    const balance = await getBalance()
    res.status(201).json({ message: 'Fund recorded successfully.', fund, ...balance })
  } catch (error) {
    serverError(res, error)
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
      source: fund.source,
      amount: fund.amount,
      referenceNumber: fund.referenceNumber,
      dateReceived: fund.dateReceived,
      purpose: fund.purpose,
      notes: fund.notes,
    }

    const updates = pick(req.body, FUND_EDITABLE)
    if (updates.amount !== undefined) updates.amount = Number(updates.amount)

    // Build change description
    const changes = []
    if (updates.amount !== undefined && updates.amount !== fund.amount)
      changes.push(`Amount: ₱${fund.amount} → ₱${updates.amount}`)
    if (updates.source !== undefined && updates.source !== fund.source)
      changes.push(`Source: "${fund.source}" → "${updates.source}"`)
    for (const f of ['referenceNumber', 'purpose', 'sourceType']) {
      if (updates[f] !== undefined && String(updates[f]) !== String(fund[f] ?? '')) changes.push(`${f} changed`)
    }
    if (updates.receiptPhoto !== undefined && updates.receiptPhoto !== fund.receiptPhoto) changes.push('Proof replaced')

    // Apply updates (never voiding, recorder or edit history)
    Object.assign(fund, updates)

    // Log the edit
    fund.editHistory.push({
      editedBy: req.user._id,
      editedAt: new Date(),
      oldValues,
      changes: changes.join(', ') || 'Minor update',
    })

    await fund.save()

    await AuditLog.create({
      user: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'EDIT_FUND',
      details: `${req.user.firstName} ${req.user.lastName} edited fund record ID:${fund._id}. Changes: ${changes.join(', ')}`,
    })

    res.json({ message: 'Fund record updated.', fund })
  } catch (error) {
    serverError(res, error)
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

    fund.isVoided = true
    fund.voidReason = reason
    fund.voidedBy = req.user._id
    fund.voidedAt = new Date()
    await fund.save()

    await AuditLog.create({
      user: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'VOID_FUND',
      details: `${req.user.firstName} ${req.user.lastName} voided fund record ID:${fund._id}. Reason: ${reason}`,
    })

    res.json({ message: 'Fund record voided.', fund })
  } catch (error) {
    serverError(res, error)
  }
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────

// GET /api/finance/expenses
const getExpenses = async (req, res) => {
  try {
    const { status, activity, project, program } = req.query
    const filter = {}
    if (status) filter.status = status
    if (activity) filter.activity = activity
    if (project) filter.project = project
    if (program) filter.program = program

    const expenses = await Expense.find(filter)
      .populate('recordedBy', 'firstName lastName role')
      .populate('approvedBy', 'firstName lastName role')
      .populate('rejectedBy', 'firstName lastName role')
      .populate('voidedBy', 'firstName lastName role')
      .populate('activity', 'title')
      .populate('project', 'title')
      .populate('program', 'title')
      .populate('project', 'title')
      .populate('program', 'title')
      .sort({ dateSpent: -1 })

    const balance = await getBalance()
    res.json({ expenses, ...balance })
  } catch (error) {
    serverError(res, error)
  }
}

// POST /api/finance/expenses
// Treasurer or Chairperson records an expense
const recordExpense = async (req, res) => {
  try {
    const {
      title, description, category, amount,
      receiptNumber, receiptPhoto, receiptDate, vendor,
      dateSpent, activity, project, program, notes, items, source,
    } = req.body

    const itemList = Array.isArray(items)
      ? items.filter((it) => it && Number(it.amount) > 0)
        .map((it) => ({ description: it.description || '', quantity: Number(it.quantity) || 1, amount: Number(it.amount), category: it.category || category || 'other' }))
      : []

    // Total from items when provided, else the given amount
    const finalAmount = itemList.length ? itemList.reduce((s, it) => s + it.amount, 0) : Number(amount)

    if (!title || !finalAmount || !dateSpent) {
      return res.status(400).json({ message: 'Title, amount, and date spent are required.' })
    }

    const ppa = await resolvePpa({ program, project, activity })
    if (ppa.error) return res.status(400).json({ message: ppa.error })

    const balance = await getBalance()
    if (finalAmount > balance.balance) {
      return res.status(400).json({
        message: `Insufficient funds. Available balance: ₱${balance.balance.toLocaleString()}. Expense amount: ₱${finalAmount.toLocaleString()}.`
      })
    }

    const expense = await Expense.create({
      title, description, category, amount: finalAmount,
      items: itemList,
      receiptNumber: receiptNumber || '',
      receiptPhoto: receiptPhoto || '',
      receiptDate: receiptDate || dateSpent,
      vendor: vendor || '',
      dateSpent,
      activity: ppa.activity,
      project: ppa.project,
      program: ppa.program,
      notes: notes || '',
      source: source === 'scanned' ? 'scanned' : 'manual',
      status: 'pending',
      recordedBy: req.user._id,
    })

    await expense.populate([
      { path: 'recordedBy', select: 'firstName lastName role' },
      { path: 'activity', select: 'title' },
      { path: 'project', select: 'title' },
      { path: 'program', select: 'title' },
    ])

    await AuditLog.create({
      user: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'RECORD_EXPENSE',
      details: `${req.user.firstName} ${req.user.lastName} recorded ${expense.source} expense: "${title}" ₱${finalAmount} (${itemList.length} item/s) from ${vendor || 'N/A'} on ${dateSpent}`,
    })

    res.status(201).json({ message: 'Expense recorded. Waiting for Chairperson approval.', expense })
  } catch (error) {
    serverError(res, error)
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

    expense.status = 'approved'
    expense.approvedBy = req.user._id
    expense.approvedAt = new Date()
    await expense.save()

    // Sync actual cost to activity
    if (expense.activity) {
      const actExpenses = await Expense.find({
        activity: expense.activity, status: 'approved', isVoided: false
      })
      const total = actExpenses.reduce((sum, e) => sum + e.amount, 0)
      await Activity.findByIdAndUpdate(expense.activity, { actualCost: total })
    }

    await AuditLog.create({
      user: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'APPROVE_EXPENSE',
      details: `${req.user.firstName} ${req.user.lastName} APPROVED expense: "${expense.title}" ₱${expense.amount}`,
    })

    res.json({ message: 'Expense approved.', expense })
  } catch (error) {
    serverError(res, error)
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

    expense.status = 'rejected'
    expense.rejectedBy = req.user._id
    expense.rejectedAt = new Date()
    expense.rejectionReason = reason
    await expense.save()

    await AuditLog.create({
      user: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'REJECT_EXPENSE',
      details: `${req.user.firstName} ${req.user.lastName} REJECTED expense: "${expense.title}" ₱${expense.amount}. Reason: ${reason}`,
    })

    res.json({ message: 'Expense rejected.', expense })
  } catch (error) {
    serverError(res, error)
  }
}

// PUT /api/finance/expenses/:id/ppa  (Chairperson) — body: { program?, project?, activity? }
// Link (or re-link) an expense to the PPA it was spent on, e.g. expenses recorded before
// the PPA could be chosen. Empty body = unlink. Logged with the old and new PPA.
const linkExpensePpa = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('program', 'title')
    if (!expense) return res.status(404).json({ message: 'Expense not found.' })
    if (expense.isVoided) return res.status(400).json({ message: 'A voided expense can’t be linked.' })

    const ppa = await resolvePpa(req.body)
    if (ppa.error) return res.status(400).json({ message: ppa.error })
    const before = expense.program?.title || 'no PPA'
    expense.program = ppa.program
    expense.project = ppa.project
    expense.activity = ppa.activity
    await expense.save()
    await expense.populate([{ path: 'program', select: 'title' }, { path: 'project', select: 'title' }, { path: 'activity', select: 'title' }])

    const after = [expense.program?.title, expense.project?.title, expense.activity?.title].filter(Boolean).join(' › ') || 'no PPA'
    await AuditLog.create({
      user: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'LINK_EXPENSE_PPA',
      details: `${req.user.firstName} ${req.user.lastName} linked expense "${expense.title}" (₱${expense.amount}) to ${after} (was: ${before})`,
    })
    res.json({ message: ppa.program ? `Linked to ${after}.` : 'Expense unlinked from its PPA.', expense })
  } catch (error) {
    serverError(res, error)
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

    expense.isVoided = true
    expense.voidReason = reason
    expense.voidedBy = req.user._id
    expense.voidedAt = new Date()
    expense.status = 'voided'
    await expense.save()

    await AuditLog.create({
      user: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'VOID_EXPENSE',
      details: `${req.user.firstName} ${req.user.lastName} VOIDED expense: "${expense.title}" ₱${expense.amount}. Reason: ${reason}`,
    })

    res.json({ message: 'Expense voided.', expense })
  } catch (error) {
    serverError(res, error)
  }
}

// ── REPORTS & BALANCE ─────────────────────────────────────────────────────────

// GET /api/finance/summary
// Full financial summary — total funds, total expenses, balance
// GET /api/finance/summary  (role-aware)
const getSummary = async (req, res) => {
  try {
    const balance = await getBalance()

    const fundsBySource = await Fund.aggregate([
      { $match: { isVoided: false } },
      { $group: { _id: '$sourceType', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    const expensesByCategory = await Expense.aggregate([
      { $match: { status: 'approved', isVoided: false } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    const pendingCount = await Expense.countDocuments({ status: 'pending', isVoided: false })
    const pendingTotal = await Expense.aggregate([
      { $match: { status: 'pending', isVoided: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])

    const settings = await getSettings()
    const published = publishedView(settings.publishedBudget)

    // Kabataan never see the recorded total funds or balance (SK Chairperson's directive).
    // They see what was spent, plus the budget figure the Chairperson chose to publish.
    if (req.user?.role === 'kabataan') {
      return res.json({
        kabataanView: true,
        totalUtilized: balance.totalExpenses,
        expensesByCategory,
        published: published && { ...published, remaining: Math.max(0, published.amount - balance.totalExpenses) },
      })
    }

    res.json({
      ...balance,
      published,
      pendingExpenses: { count: pendingCount, total: pendingTotal[0]?.total || 0 },
      fundsBySource,
      expensesByCategory,
    })
  } catch (error) {
    serverError(res, error)
  }
}

// PUT /api/finance/published-budget  (Chairperson)
// Body: { amount: number|null, label?: string } — null stops publishing a budget figure.
const setPublishedBudget = async (req, res) => {
  try {
    const raw = req.body.amount
    const amount = raw === null || raw === '' || raw === undefined ? null : Number(raw)
    const label = typeof req.body.label === 'string' ? req.body.label.trim().slice(0, 80) : ''
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      return res.status(400).json({ message: 'Enter a valid amount.' })
    }

    const { totalFunds, totalExpenses } = await getBalance()
    // The published budget can't be lower than what has already been spent.
    if (amount !== null && amount < totalExpenses) {
      return res.status(400).json({ message: `The published budget can't be lower than what has already been spent (₱${totalExpenses.toLocaleString('en-PH')}).` })
    }

    const s = await getSettings()
    const before = s.publishedBudget?.amount ?? null
    s.publishedBudget = { amount, label: amount === null ? '' : label, updatedAt: new Date(), updatedBy: req.user._id }
    await s.save()

    const money = (n) => (n === null ? 'not published' : `₱${Number(n).toLocaleString('en-PH')}`)
    await AuditLog.create({
      user: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      action: 'PUBLISH_BUDGET',
      details: `${req.user.firstName} ${req.user.lastName} changed the budget shown to kabataan: ${money(before)} → ${money(amount)}${label && amount !== null ? ` ("${label}")` : ''}. Recorded funds at the time: ₱${totalFunds.toLocaleString('en-PH')}.`,
    })

    res.json({ message: amount === null ? 'Kabataan no longer see a budget figure.' : 'Published budget updated.', published: publishedView(s.publishedBudget) })
  } catch (error) {
    serverError(res, error)
  }
}

// GET /api/finance/ledger
// Full transaction ledger — every fund and expense in chronological order
const getLedger = async (req, res) => {
  try {
    const funds = await Fund.find({ isVoided: false })
      .populate('recordedBy', 'firstName lastName role')
      .lean()

    const expenses = await Expense.find({ status: 'approved', isVoided: false })
      .populate('recordedBy', 'firstName lastName role')
      .populate('approvedBy', 'firstName lastName role')
      .populate('activity', 'title')
      .lean()

    // Combine and sort by date
    const ledger = [
      ...funds.map(f => ({ ...f, entryType: 'fund', date: f.dateReceived })),
      ...expenses.map(e => ({ ...e, entryType: 'expense', date: e.dateSpent })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date))

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
    serverError(res, error)
  }
}

module.exports = {
  // Funds
  getFunds, recordFund, editFund, voidFund,
  // Expenses
  getExpenses, recordExpense, approveExpense, rejectExpense, voidExpense, linkExpensePpa,
  // Reports
  getSummary, getLedger, setPublishedBudget,
}