// ============================================================
// File:    financialReport.test.js
// Test:    The SK Financial Report — beginning balance, receipts by source, disbursements,
//          ending balance, utilization per PPA (reconciled with an "unlinked" line),
//          categories and the detail lists. Only approved, non-voided money counts.
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/Program')
jest.mock('../models/Fund')
jest.mock('../models/Expense')
jest.mock('../models/Report')
jest.mock('../models/User')
jest.mock('../models/AuditLog')
jest.mock('../models/Project')
jest.mock('../models/Activity')

const Program  = require('../models/Program')
const Fund     = require('../models/Fund')
const Expense  = require('../models/Expense')
const User     = require('../models/User')
const Project  = require('../models/Project')
const Activity = require('../models/Activity')
const { getFinancialReportPrefill, getAbyipPrefill } = require('../controllers/reportController')

const makeReq = (query) => httpMocks.createRequest({ query, user: { _id: 't1', role: 'sk_treasurer' }, headers: {} })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}

// A query that can be chained (.sort/.populate/.select) and awaited
const query = (rows) => {
  const q = { sort: () => q, populate: () => q, select: () => q, then: (ok, fail) => Promise.resolve(rows).then(ok, fail) }
  return q
}
// Applies the parts of a Mongo filter the controller uses
const inRange = (d, r) => !r || ((r.$lt === undefined || d < r.$lt) && (r.$gte === undefined || d >= r.$gte) && (r.$lte === undefined || d <= r.$lte))
const matches = (row, f, dateKey) => (f.isVoided === undefined || row.isVoided === f.isVoided)
  && (f.status === undefined || row.status === f.status) && inRange(row[dateKey], f[dateKey])

const educ = { _id: 'p1', title: 'Educational Assistance', area: 'Education', referenceCode: '3000-001', budget: { mooe: 8000 } }
const sports = { _id: 'p2', title: 'Sports Fest', area: 'Sports', referenceCode: '3000-002', totalBudget: 20000, budget: {} }
const d = (s) => new Date(`${s}T10:00:00+08:00`)

const funds = [
  { amount: 5000, sourceType: 'barangay_allocation', dateReceived: d('2025-03-01'), isVoided: false, source: 'BGF 2025' },
  { amount: 50000, sourceType: 'barangay_allocation', dateReceived: d('2026-01-05'), isVoided: false, source: 'BGF 2026', referenceNumber: 'DV-01' },
  { amount: 3000, sourceType: 'donation', dateReceived: d('2026-06-10'), isVoided: false, source: 'Mayor’s office' },
  { amount: 9999, sourceType: 'grant', dateReceived: d('2026-07-01'), isVoided: true, source: 'voided' },
  // Jan 1 2027 00:30 in Manila is still Dec 31 2026 in UTC — must be counted as 2027
  { amount: 777, sourceType: 'other', dateReceived: new Date('2027-01-01T00:30:00+08:00'), isVoided: false, source: 'next year' },
]
const expenses = [
  { title: 'Old supplies', amount: 1000, status: 'approved', isVoided: false, dateSpent: d('2025-05-01'), category: 'supplies' },
  { title: 'School kits', amount: 8500, status: 'approved', isVoided: false, dateSpent: d('2026-02-01'), category: 'supplies', program: { _id: 'p1', title: 'Educational Assistance' }, vendor: 'NBS', receiptNumber: 'OR-1' },
  { title: 'Jerseys', amount: 4000, status: 'approved', isVoided: false, dateSpent: d('2026-04-01'), category: 'equipment', project: 'pr2' },
  { title: 'Snacks', amount: 1500, status: 'approved', isVoided: false, dateSpent: d('2026-04-02'), category: 'food' },
  { title: 'Pending venue', amount: 2000, status: 'pending', isVoided: false, dateSpent: d('2026-05-01'), category: 'venue' },
  { title: 'Voided', amount: 600, status: 'approved', isVoided: true, dateSpent: d('2026-05-02'), category: 'food' },
]

beforeEach(() => {
  jest.clearAllMocks()
  Fund.find = jest.fn((f) => query(funds.filter((r) => matches(r, f, 'dateReceived'))))
  Expense.find = jest.fn((f) => query(expenses.filter((r) => matches(r, f, 'dateSpent'))))
  Project.find = jest.fn(() => query([{ _id: 'pr2', program: 'p2' }]))
  Activity.find = jest.fn(() => query([]))
  Program.find = jest.fn(() => query([educ, sports]))
  User.findOne = jest.fn(() => query({ firstName: 'Tess', lastName: 'Reyes' }))
})

const run = async (year = '2026') => {
  const res = makeRes()
  await getFinancialReportPrefill(makeReq({ year }), res)
  return res._json
}

describe('Financial report', () => {
  test('statement: beginning balance + receipts − disbursements = ending balance', async () => {
    const { statement } = await run()
    expect(statement.beginning).toBe(4000)                 // 5,000 in 2025 − 1,000 spent in 2025
    expect(statement.totalReceipts).toBe(53000)            // voided grant and 2027 money excluded
    expect(statement.receipts.find((r) => r.key === 'barangay_allocation').amount).toBe(50000)
    expect(statement.receipts.find((r) => r.key === 'donation').amount).toBe(3000)
    expect(statement.receipts.find((r) => r.key === 'grant').amount).toBe(0)
    expect(statement.available).toBe(57000)
    expect(statement.disbursements).toBe(14000)            // pending and voided excluded
    expect(statement.ending).toBe(43000)
  })

  test('PPA utilization rolls project spending up to its program and reconciles with the statement', async () => {
    const r = await run()
    const byTitle = Object.fromEntries(r.ppas.map((p) => [p.ppa, p]))
    expect(byTitle['Educational Assistance']).toEqual(expect.objectContaining({ appropriation: 8000, actual: 8500 }))
    expect(byTitle['Sports Fest']).toEqual(expect.objectContaining({ appropriation: 20000, actual: 4000 }))
    expect(r.unlinked).toBe(1500)
    const ppaTotal = r.ppas.reduce((s, p) => s + p.actual, 0) + r.unlinked
    expect(ppaTotal).toBe(r.statement.disbursements)
  })

  test('categories, detail lists, pending note and signatories', async () => {
    const r = await run()
    expect(r.categories).toEqual([
      { category: 'supplies', amount: 8500 }, { category: 'equipment', amount: 4000 }, { category: 'food', amount: 1500 },
    ])
    expect(r.receiptList.map((x) => x.amount)).toEqual([50000, 3000])
    expect(r.disbursementList[0]).toEqual(expect.objectContaining({ particulars: 'School kits', payee: 'NBS', receiptNumber: 'OR-1', ppa: 'Educational Assistance', amount: 8500 }))
    expect(r.pending).toEqual({ count: 1, amount: 2000 })
    expect(r.signatories).toEqual(expect.objectContaining({ preparedBy: 'Tess Reyes', preparedByTitle: 'SK Treasurer', notedApprovedTitle: 'Punong Barangay' }))
  })

  test('a year with no records is all zeros', async () => {
    const r = await run('2020')
    expect(r.statement).toEqual(expect.objectContaining({ beginning: 0, totalReceipts: 0, disbursements: 0, ending: 0 }))
    expect(r.categories).toEqual([])
  })
})

describe('ABYIP funding header', () => {
  test('beginning balance is left blank — an expense dated in an earlier year does not make it negative', async () => {
    const res = makeRes()
    await getAbyipPrefill(makeReq({ year: '2026' }), res)
    const h = res._json.fundingHeader
    expect(h.beginningBalance).toBe('')                    // 2025 had ₱1,000 spent against ₱5,000 — still not computed
    expect(h.tenPercentGF).toBe(50000)
    expect(h.fundRaising).toBe(3000)
    expect(h.totalAvailable).toBe(53000)
  })
})
