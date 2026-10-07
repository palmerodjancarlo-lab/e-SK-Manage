// controllers/budgetController.js
// Budget breakdown for the PPA hierarchy: Program → Project → Activity.
// "Spent" always comes from real APPROVED, non-voided expenses linked to each
// level (Expense has program/project/activity refs), so the numbers are auditable
// and roll up automatically. Nothing here is typed by hand.

const Program  = require('../models/Program')
const Project  = require('../models/Project')
const Activity = require('../models/Activity')
const Expense  = require('../models/Expense')

// Sum of approved expenses for one program, grouped by a field (project/activity).
// Returns a map { id: amountSpent }.
const spentGroupedBy = async (field, programId) => {
  const rows = await Expense.aggregate([
    { $match: { program: programId, status: 'approved', isVoided: false } },
    { $group: { _id: `$${field}`, total: { $sum: '$amount' } } },
  ])
  const map = {}
  rows.forEach((r) => { if (r._id) map[String(r._id)] = r.total })
  return map
}

const budgetOf = (program) =>
  program.totalBudget || (program.fundSources || []).reduce((s, f) => s + (f.amount || 0), 0)

// GET /api/v1/budget/program/:id  → full breakdown of one program
const getProgramBreakdown = async (req, res) => {
  try {
    const id = req.params.id
    const program = await Program.findById(id).populate('organizer', 'firstName lastName')
    if (!program) return res.status(404).json({ message: 'Program not found' })

    const [projects, activities, spentByProject, spentByActivity, totalRows] = await Promise.all([
      Project.find({ program: id }).lean(),
      Activity.find({ program: id }).lean(),
      spentGroupedBy('project', id),
      spentGroupedBy('activity', id),
      Expense.aggregate([
        { $match: { program: program._id, status: 'approved', isVoided: false } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ])

    const totalSpent = totalRows[0]?.total || 0
    const totalBudget = budgetOf(program)
    const allocated = projects.reduce((s, p) => s + (p.allocatedBudget || 0), 0)

    const projectTree = projects.map((p) => {
      const acts = activities
        .filter((a) => String(a.project) === String(p._id))
        .map((a) => {
          const spent = spentByActivity[String(a._id)] ?? (a.actualCost || 0)
          return {
            _id: a._id, title: a.title, status: a.status,
            estimatedCost: a.estimatedCost || 0, spent,
          }
        })
      const spent = spentByProject[String(p._id)] ?? acts.reduce((s, a) => s + a.spent, 0)
      const alloc = p.allocatedBudget || 0
      return {
        _id: p._id, title: p.title, status: p.status,
        allocatedBudget: alloc, spent, remaining: alloc - spent,
        activities: acts,
      }
    })

    res.json({
      program: {
        _id: program._id, title: program.title, category: program.category, status: program.status,
        totalBudget, allocated, spent: totalSpent, remaining: totalBudget - totalSpent,
        utilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      },
      projects: projectTree,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/v1/budget/overview  → every program with budget vs spent (for lists/dashboards)
const getBudgetOverview = async (req, res) => {
  try {
    const programs = await Program.find().lean()
    const rows = await Expense.aggregate([
      { $match: { status: 'approved', isVoided: false, program: { $ne: null } } },
      { $group: { _id: '$program', total: { $sum: '$amount' } } },
    ])
    const spentMap = {}
    rows.forEach((r) => { if (r._id) spentMap[String(r._id)] = r.total })

    res.json({
      programs: programs.map((p) => {
        const totalBudget = budgetOf(p)
        const spent = spentMap[String(p._id)] || 0
        return {
          _id: p._id, title: p.title, category: p.category, status: p.status,
          totalBudget, spent, remaining: totalBudget - spent,
          utilization: totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0,
        }
      }),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getProgramBreakdown, getBudgetOverview }