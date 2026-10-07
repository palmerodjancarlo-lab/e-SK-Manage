// controllers/reportController.js
// Builds a pre-filled ABYIP from live Program + Fund + Expense data,
// and stores editable report snapshots in the Report collection.
const Program = require('../models/Program')
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
    const start = new Date(`${year}-01-01T00:00:00.000Z`)
    const end = new Date(`${year}-12-31T23:59:59.999Z`)

    // ── Funding header (from Fund records) ──
    const yearFunds = await Fund.find({ isVoided: false, dateReceived: { $gte: start, $lte: end } })
    const tenPercentGF = yearFunds.filter(f => f.sourceType === 'barangay_allocation').reduce((s, f) => s + num(f.amount), 0)
    const fundRaising = yearFunds.filter(f => f.sourceType !== 'barangay_allocation').reduce((s, f) => s + num(f.amount), 0)

    // Beginning balance = carry-over before this year (funds in − approved expenses out)
    const [priorFunds, priorExpenses] = await Promise.all([
      Fund.aggregate([{ $match: { isVoided: false, dateReceived: { $lt: start } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { status: 'approved', isVoided: false, dateSpent: { $lt: start } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ])
    const beginningBalance = num(priorFunds[0]?.total) - num(priorExpenses[0]?.total)
    const totalAvailable = beginningBalance + tenPercentGF + fundRaising

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

    // ── Signatories (from Users) ──
    const [sec, chair] = await Promise.all([
      User.findOne({ role: 'sk_secretary', isActive: true }).select('firstName lastName'),
      User.findOne({ role: { $in: ['sk_chairperson', 'admin'] }, isActive: true }).select('firstName lastName'),
    ])

    res.json({
      fiscalYear: year,
      fundingHeader: { beginningBalance, tenPercentGF, fundRaising, totalAvailable },
      areas,
      grandTotal,
      signatories: {
        preparedBy: sec ? `${sec.firstName} ${sec.lastName}` : '',
        preparedByTitle: 'SK Secretary',
        recommendingApproval: chair ? `${chair.firstName} ${chair.lastName}` : '',
        recommendingApprovalTitle: 'SK Chairperson',
        notedApproved: '',                 // Punong Barangay — filled by the SK
        notedApprovedTitle: 'Punong Barangay',
      },
    })
  } catch (e) {
    res.status(500).json({ message: e.message })
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
  } catch (e) { res.status(500).json({ message: e.message }) }
}

// GET /api/finance/reports
const listReports = async (req, res) => {
  try {
    const reports = await Report.find().populate('generatedBy', 'firstName lastName role').sort({ createdAt: -1 })
    res.json({ reports })
  } catch (e) { res.status(500).json({ message: e.message }) }
}

// GET /api/finance/reports/:id
const getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('generatedBy', 'firstName lastName role')
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    res.json({ report })
  } catch (e) { res.status(500).json({ message: e.message }) }
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
  } catch (e) { res.status(500).json({ message: e.message }) }
}

// PUT /api/finance/reports/:id
const updateReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    res.json({ message: 'Report updated.', report })
  } catch (e) { res.status(500).json({ message: e.message }) }
}

// DELETE /api/finance/reports/:id
const deleteReport = async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id)
    res.json({ message: 'Report deleted.' })
  } catch (e) { res.status(500).json({ message: e.message }) }
}

// GET /api/finance/reports/accomplishment/prefill?year=2026
// Planned (Program budget) vs Actual (approved expenses) per PPA, grouped by area.
const getAccomplishmentPrefill = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear()
    const start = new Date(`${year}-01-01T00:00:00.000Z`)
    const end = new Date(`${year}-12-31T23:59:59.999Z`)

    // Map project/activity → owning program so expenses tagged at any level roll up
    const [projects, activities] = await Promise.all([
      Project.find({}, 'program'),
      Activity.find({}, 'program'),
    ])
    const projMap = {}; projects.forEach((p) => { if (p.program) projMap[p._id.toString()] = p.program.toString() })
    const actMap = {}; activities.forEach((a) => { if (a.program) actMap[a._id.toString()] = a.program.toString() })

    const expenses = await Expense.find({ status: 'approved', isVoided: false, dateSpent: { $gte: start, $lte: end } })
    const spentByProgram = {}
    for (const e of expenses) {
      const pid = (e.program && e.program.toString())
        || (e.project && projMap[e.project.toString()])
        || (e.activity && actMap[e.activity.toString()])
      if (!pid) continue
      spentByProgram[pid] = (spentByProgram[pid] || 0) + num(e.amount)
    }

    const programs = await Program.find({
      $or: [
        { fiscalYear: year },
        { startDate: { $lte: end }, endDate: { $gte: start } },
        { startDate: { $gte: start, $lte: end } },
      ],
    }).populate('organizer', 'firstName lastName').sort({ area: 1, referenceCode: 1, createdAt: 1 })

    const groups = {}
    for (const p of programs) {
      const area = p.area || 'General Program'
      if (!groups[area]) groups[area] = []
      const b = p.budget || {}
      const planned = ((b.mooe || 0) + (b.personnelServices || 0) + (b.capitalOutlay || 0)) || num(p.totalBudget)
      const actual = num(spentByProgram[p._id.toString()])
      groups[area].push({
        program: p._id,
        referenceCode: p.referenceCode || '',
        ppa: p.title,
        planned,
        actual,
        status: p.status || '',
        remarks: '',
        personResponsible: p.personResponsible || (p.organizer ? `${p.organizer.firstName} ${p.organizer.lastName}` : ''),
      })
    }
    const areas = Object.entries(groups).map(([area, rows]) => ({ area, rows }))
    const totalPlanned = areas.reduce((s, a) => s + a.rows.reduce((t, r) => t + r.planned, 0), 0)
    const totalActual = areas.reduce((s, a) => s + a.rows.reduce((t, r) => t + r.actual, 0), 0)

    const [treas, chair] = await Promise.all([
      User.findOne({ role: 'sk_treasurer', isActive: true }).select('firstName lastName'),
      User.findOne({ role: { $in: ['sk_chairperson', 'admin'] }, isActive: true }).select('firstName lastName'),
    ])

    res.json({
      fiscalYear: year,
      areas,
      totals: { planned: totalPlanned, actual: totalActual, balance: totalPlanned - totalActual, pct: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0 },
      signatories: {
        preparedBy: treas ? `${treas.firstName} ${treas.lastName}` : '', preparedByTitle: 'SK Treasurer',
        recommendingApproval: chair ? `${chair.firstName} ${chair.lastName}` : '', recommendingApprovalTitle: 'SK Chairperson',
        notedApproved: '', notedApprovedTitle: 'Punong Barangay',
      },
    })
  } catch (e) { res.status(500).json({ message: e.message }) }
}

module.exports = { getAbyipPrefill, getCbydpPrefill, getAccomplishmentPrefill, listReports, getReport, saveReport, updateReport, deleteReport }