// controllers/reportController.js
// Builds a pre-filled ABYIP from live Program + Fund + Expense data,
// and stores editable report snapshots in the Report collection.
const Program = require('../models/Program')
const serverError = require('../utils/serverError')
const Fund = require('../models/Fund')
const Expense = require('../models/Expense')
const Report = require('../models/Report')
const User = require('../models/User')
const AuditLog = require('../models/AuditLog')
const Project = require('../models/Project')
const Activity = require('../models/Activity')

const num = (v) => Number(v) || 0
const fmtMonthYear = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })

// GET /api/finance/reports/abyip/prefill?year=2026
// Assembles the ABYIP from live data — the frontend then lets the SK edit it.
const getAbyipPrefill = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear()
    const start = new Date(`${year}-01-01T00:00:00+08:00`) // Philippine time
    const end = new Date(`${year}-12-31T23:59:59.999+08:00`)

    // ── Funding header (from Fund records) ──
    const yearFunds = await Fund.find({ isVoided: false, dateReceived: { $gte: start, $lte: end } })
    const tenPercentGF = yearFunds.filter(f => f.sourceType === 'barangay_allocation').reduce((s, f) => s + num(f.amount), 0)
    const fundRaising = yearFunds.filter(f => f.sourceType !== 'barangay_allocation').reduce((s, f) => s + num(f.amount), 0)

    // Beginning balance is left blank for the SK to fill in: the system has no complete
    // record of earlier years, so a computed carry-over can be wrong (even negative).
    const beginningBalance = ''
    const totalAvailable = tenPercentGF + fundRaising

    // ── PPA rows (Programs for this year), grouped by area ──
    const programs = await Program.find({
      $or: [
        { fiscalYear: year },
        { startDate: { $lte: end }, endDate: { $gte: start } },
        { startDate: { $gte: start, $lte: end } },
      ],
    }).populate('organizer', 'firstName lastName role').sort({ referenceCode: 1, createdAt: 1 })

    const groups = {}
    for (const p of programs) {
      const area = p.area || 'General Program'
      if (!groups[area]) groups[area] = []
      const mooe = num(p.budget?.mooe)
      const ps = num(p.budget?.personnelServices)
      const co = num(p.budget?.capitalOutlay)
      const total = (mooe + ps + co) || num(p.totalBudget)
      groups[area].push({
        program: p._id,
        referenceCode: p.referenceCode || '',
        ppa: p.title,
        description: p.description || '',
        expectedResults: p.expectedResults || '',
        performanceIndicator: p.performanceIndicator || '',
        dateOfImplementation: p.dateOfImplementation
          || (p.startDate && p.endDate ? `${fmtMonthYear(p.startDate)} - ${fmtMonthYear(p.endDate)}` : `January - December ${year}`),
        mooe, ps, co, total,
        personResponsible: p.personResponsible || (p.organizer ? `${p.organizer.firstName} ${p.organizer.lastName}` : ''),
      })
    }
    const areas = Object.entries(groups).map(([area, rows]) => ({ area, rows }))
    const grandTotal = areas.reduce((s, a) => s + a.rows.reduce((t, r) => t + r.total, 0), 0)

    // ── Signatories (from Users): Prepared by the Secretary, Certified by the Treasurer,
    //    Approved by the Chairperson — the ABYIP format the SK uses
    const [sec, treas, chair] = await Promise.all([
      User.findOne({ role: 'sk_secretary', isActive: true }).select('firstName lastName'),
      User.findOne({ role: 'sk_treasurer', isActive: true }).select('firstName lastName'),
      User.findOne({ role: { $in: ['sk_chairperson', 'admin'] }, isActive: true }).select('firstName lastName'),
    ])
    const nameOf = (u) => (u ? `${u.firstName} ${u.lastName}` : '')

    res.json({
      fiscalYear: year,
      fundingHeader: { beginningBalance, tenPercentGF, fundRaising, totalAvailable },
      areas,
      grandTotal,
      signatories: {
        preparedBy: nameOf(sec),    preparedByTitle: 'SK Secretary',
        certifiedBy: nameOf(treas), certifiedByTitle: 'SK Treasurer',
        approvedBy: nameOf(chair),  approvedByTitle: 'SK Chairperson',
      },
    })
  } catch (e) {
    serverError(res, e)
  }
}

// GET /api/finance/reports/cbydp/prefill?from=2026&to=2028
// Assembles the 3-year CBYDP from live Programs, grouped by Center of Participation.
const getCbydpPrefill = async (req, res) => {
  try {
    const from = Number(req.query.from) || new Date().getFullYear()
    const to = Number(req.query.to) || (from + 2)

    const programs = await Program.find({})
      .populate('organizer', 'firstName lastName')
      .sort({ centerOfParticipation: 1, referenceCode: 1, createdAt: 1 })

    const inCycle = programs.filter((p) => {
      if (p.centerOfParticipation) return true
      const y = p.fiscalYear || (p.startDate ? new Date(p.startDate).getFullYear() : null)
      return y ? (y >= from && y <= to) : false
    })

    const groups = {}
    for (const p of inCycle) {
      const center = p.centerOfParticipation || 'Other'
      if (!groups[center]) groups[center] = []
      const b = p.budget || {}
      const budget = ((b.mooe || 0) + (b.personnelServices || 0) + (b.capitalOutlay || 0)) || (p.totalBudget || 0)
      groups[center].push({
        program: p._id,
        concern: '',
        objective: p.objective || '',
        performanceIndicator: p.performanceIndicator || '',
        fy1: p.targets?.fy1 || '',
        fy2: p.targets?.fy2 || '',
        fy3: p.targets?.fy3 || '',
        ppa: p.title,
        budget,
        personResponsible: p.personResponsible || (p.organizer ? `${p.organizer.firstName} ${p.organizer.lastName}` : ''),
      })
    }
    const centers = Object.entries(groups).map(([center, rows]) => ({ center, rows }))

    const [sec, chair] = await Promise.all([
      User.findOne({ role: 'sk_secretary', isActive: true }).select('firstName lastName'),
      User.findOne({ role: { $in: ['sk_chairperson', 'admin'] }, isActive: true }).select('firstName lastName'),
    ])

    res.json({
      cycleFrom: from, cycleTo: to,
      years: [from, from + 1, from + 2],
      centers,
      signatories: {
        preparedBy: sec ? `${sec.firstName} ${sec.lastName}` : '', preparedByTitle: 'SK Secretary',
        recommendingApproval: chair ? `${chair.firstName} ${chair.lastName}` : '', recommendingApprovalTitle: 'SK Chairperson',
        notedApproved: '', notedApprovedTitle: 'Punong Barangay',
      },
    })
  } catch (e) { serverError(res, e) }
}

// GET /api/finance/reports
const listReports = async (req, res) => {
  try {
    const reports = await Report.find().populate('generatedBy', 'firstName lastName role').sort({ createdAt: -1 })
    res.json({ reports })
  } catch (e) { serverError(res, e) }
}

// GET /api/finance/reports/:id
const getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('generatedBy', 'firstName lastName role')
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    res.json({ report })
  } catch (e) { serverError(res, e) }
}

// POST /api/finance/reports — save an edited snapshot
const saveReport = async (req, res) => {
  try {
    const { title, type = 'abyip', fiscalYear, periodStart, periodEnd, data, summary, status } = req.body
    if (!title) return res.status(400).json({ message: 'Report title is required.' })

    const report = await Report.create({
      title, type, fiscalYear, periodStart, periodEnd,
      data: data || {}, summary: summary || {},
      status: status || 'draft',
      generatedBy: req.user._id,
    })

    await AuditLog.create({
      user: req.user._id, action: 'GENERATE_REPORT',
      details: `${req.user.firstName} ${req.user.lastName} saved ${type.toUpperCase()} report: "${title}" (${status || 'draft'})`,
    })

    res.status(201).json({ message: 'Report saved.', report })
  } catch (e) { serverError(res, e) }
}

// PUT /api/finance/reports/:id
// Only report content can change — never who generated it, its type, or timestamps.
const EDITABLE = ['title', 'fiscalYear', 'periodStart', 'periodEnd', 'data', 'summary', 'status', 'notes']
const updateReport = async (req, res) => {
  try {
    const changes = {}
    for (const k of EDITABLE) if (req.body[k] !== undefined) changes[k] = req.body[k]
    const report = await Report.findById(req.params.id)
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    const wasStatus = report.status
    Object.assign(report, changes)
    await report.save()

    await AuditLog.create({
      user: req.user._id, action: 'UPDATE_REPORT',
      details: `${req.user.firstName} ${req.user.lastName} updated report "${report.title}"${changes.status && changes.status !== wasStatus ? ` (${wasStatus} → ${changes.status})` : ''}`,
    }).catch(() => {})

    res.json({ message: 'Report updated.', report })
  } catch (e) { serverError(res, e) }
}

// DELETE /api/finance/reports/:id
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id)
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    await AuditLog.create({
      user: req.user._id, action: 'DELETE_REPORT',
      details: `${req.user.firstName} ${req.user.lastName} deleted ${String(report.type).toUpperCase()} report "${report.title}" (${report.status})`,
    }).catch(() => {})
    res.json({ message: 'Report deleted.' })
  } catch (e) { serverError(res, e) }
}

// GET /api/finance/reports/financial/prefill?year=2026  (old path: /reports/accomplishment/prefill)
// The SK Financial Report for a fiscal year, built from the money records:
//   I.  Statement of receipts and disbursements (beginning balance + receipts − disbursements)
//   II. Fund utilization by PPA (ABYIP appropriation vs actual, reconciled to I)
//   III. Disbursements by category   IV. Details of receipts and of disbursements
// Only recorded (non-voided) funds and APPROVED (non-voided) expenses count.
const SOURCE_LABEL = { barangay_allocation: '10% Barangay General Fund allocation', donation: 'Donations', grant: 'Grants', other: 'Other receipts (e.g. fund-raising)' }
const getFinancialReportPrefill = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear()
    // Philippine time, so Jan 1 00:00 and Dec 31 23:59 are local
    const start = new Date(`${year}-01-01T00:00:00+08:00`)
    const end = new Date(`${year}-12-31T23:59:59.999+08:00`)
    const inYear = { $gte: start, $lte: end }
    const sum = (rows) => rows.reduce((s, r) => s + num(r.amount), 0)

    const [fundsBefore, spentBefore, funds, expenses, pending, projects, activities] = await Promise.all([
      Fund.find({ isVoided: false, dateReceived: { $lt: start } }, 'amount'),
      Expense.find({ status: 'approved', isVoided: false, dateSpent: { $lt: start } }, 'amount'),
      Fund.find({ isVoided: false, dateReceived: inYear }).sort({ dateReceived: 1 }),
      Expense.find({ status: 'approved', isVoided: false, dateSpent: inYear })
        .populate('program', 'title referenceCode').sort({ dateSpent: 1 }),
      Expense.find({ status: 'pending', isVoided: false, dateSpent: inYear }, 'amount'),
      Project.find({}, 'program'),
      Activity.find({}, 'program'),
    ])

    // I. Statement
    const beginning = sum(fundsBefore) - sum(spentBefore)
    const bySource = {}
    funds.forEach((f) => { bySource[f.sourceType || 'other'] = (bySource[f.sourceType || 'other'] || 0) + num(f.amount) })
    const receipts = Object.keys(SOURCE_LABEL).map((k) => ({ key: k, label: SOURCE_LABEL[k], amount: bySource[k] || 0 }))
    const totalReceipts = sum(funds)
    const disbursements = sum(expenses)
    const statement = {
      beginning, receipts, totalReceipts,
      available: beginning + totalReceipts,
      disbursements,
      ending: beginning + totalReceipts - disbursements,
    }

    // II. Utilization by PPA — expenses tagged at project/activity level roll up to their program
    const projMap = {}; projects.forEach((p) => { if (p.program) projMap[String(p._id)] = String(p.program) })
    const actMap = {}; activities.forEach((a) => { if (a.program) actMap[String(a._id)] = String(a.program) })
    const programOf = (e) => (e.program && String(e.program._id || e.program))
      || (e.project && projMap[String(e.project)]) || (e.activity && actMap[String(e.activity)]) || null
    const spentByProgram = {}
    let unlinked = 0
    for (const e of expenses) {
      const pid = programOf(e)
      if (pid) spentByProgram[pid] = (spentByProgram[pid] || 0) + num(e.amount)
      else unlinked += num(e.amount)
    }
    const programs = await Program.find({
      $or: [
        { fiscalYear: year },
        { startDate: { $lte: end }, endDate: { $gte: start } },
        { _id: { $in: Object.keys(spentByProgram) } }, // anything that had spending this year
      ],
    }).sort({ area: 1, referenceCode: 1, createdAt: 1 })
    const ppas = programs.map((p) => {
      const b = p.budget || {}
      const appropriation = ((b.mooe || 0) + (b.personnelServices || 0) + (b.capitalOutlay || 0)) || num(p.totalBudget)
      const actual = num(spentByProgram[String(p._id)])
      return { program: p._id, area: p.area || 'General Program', referenceCode: p.referenceCode || '', ppa: p.title, appropriation, actual }
    })

    // III. By category
    const byCat = {}
    expenses.forEach((e) => { byCat[e.category || 'other'] = (byCat[e.category || 'other'] || 0) + num(e.amount) })
    const categories = Object.entries(byCat).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)

    // IV. Details
    const receiptList = funds.map((f) => ({
      date: f.dateReceived, source: f.source, sourceType: f.sourceType, referenceNumber: f.referenceNumber || '', purpose: f.purpose || '', amount: num(f.amount),
    }))
    const titleOf = Object.fromEntries(programs.map((p) => [String(p._id), p.title]))
    const disbursementList = expenses.map((e) => ({
      date: e.dateSpent, particulars: e.title, payee: e.vendor || '', receiptNumber: e.receiptNumber || '',
      ppa: titleOf[programOf(e)] || e.program?.title || '', category: e.category || 'other', amount: num(e.amount),
    }))

    const [treas, chair] = await Promise.all([
      User.findOne({ role: 'sk_treasurer', isActive: true }).select('firstName lastName'),
      User.findOne({ role: { $in: ['sk_chairperson', 'admin'] }, isActive: true }).select('firstName lastName'),
    ])

    res.json({
      fiscalYear: year,
      generatedAt: new Date(),
      statement, ppas, unlinked, categories, receiptList, disbursementList,
      pending: { count: pending.length, amount: sum(pending) },
      signatories: {
        preparedBy: treas ? `${treas.firstName} ${treas.lastName}` : '', preparedByTitle: 'SK Treasurer',
        recommendingApproval: chair ? `${chair.firstName} ${chair.lastName}` : '', recommendingApprovalTitle: 'SK Chairperson',
        notedApproved: '', notedApprovedTitle: 'Punong Barangay',
      },
    })
  } catch (e) { serverError(res, e) }
}

module.exports = { getAbyipPrefill, getCbydpPrefill, getFinancialReportPrefill, listReports, getReport, saveReport, updateReport, deleteReport }