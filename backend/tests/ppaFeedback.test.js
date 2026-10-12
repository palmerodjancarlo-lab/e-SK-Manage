// ============================================================
// File:    ppaFeedback.test.js
// Test:    Expenses linked to their PPA (so Budget Utilization adds them up),
//          event feedback opening at the start, ABYIP signatories,
//          and Rewards limited to the Secretary and Chairperson.
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/Expense')
jest.mock('../models/Fund')
jest.mock('../models/Activity')
jest.mock('../models/Project')
jest.mock('../models/Program')
jest.mock('../models/AuditLog')
jest.mock('../models/Setting')
jest.mock('../models/Meeting')
jest.mock('../models/User')

const Expense  = require('../models/Expense')
const Fund     = require('../models/Fund')
const Activity = require('../models/Activity')
const Project  = require('../models/Project')
const Program  = require('../models/Program')
const AuditLog = require('../models/AuditLog')
const Meeting  = require('../models/Meeting')
const { recordExpense, linkExpensePpa } = require('../controllers/financeController')
const { addComment } = require('../controllers/meetingController')

const chair = { _id: 'c1', firstName: 'Maria', lastName: 'Santos', role: 'sk_chairperson' }
const kab   = { _id: 'k1', firstName: 'Ana', lastName: 'Cruz', role: 'kabataan' }
const PROG = '64b0000000000000000000a1'
const PROJ = '64b0000000000000000000b1'
const ACT  = '64b0000000000000000000c1'
const makeReq = (user, body = {}, params = {}) => httpMocks.createRequest({ user, body, params, headers: {} })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}
const selectable = (value) => ({ select: jest.fn().mockResolvedValue(value) })

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
  Fund.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 100000 }])
  Expense.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 0 }])
  Expense.create = jest.fn().mockImplementation(async (d) => { const e = { _id: 'e1', ...d }; e.populate = jest.fn().mockResolvedValue(e); return e })
})

describe('recording an expense against a PPA', () => {
  const body = (ppa) => ({ title: 'Snacks', amount: 500, dateSpent: '2026-10-10', ...ppa })

  test('picking an activity also saves its project and program', async () => {
    Activity.findById = jest.fn(() => selectable({ _id: ACT, project: PROJ, program: PROG }))
    const res = makeRes()
    await recordExpense(makeReq(chair, body({ activity: ACT })), res)
    expect(Expense.create).toHaveBeenCalledWith(expect.objectContaining({ activity: ACT, project: PROJ, program: PROG }))
  })

  test('picking a project saves its program', async () => {
    Project.findById = jest.fn(() => selectable({ _id: PROJ, program: PROG }))
    const res = makeRes()
    await recordExpense(makeReq(chair, body({ project: PROJ })), res)
    expect(Expense.create).toHaveBeenCalledWith(expect.objectContaining({ activity: null, project: PROJ, program: PROG }))
  })

  test('a PPA that no longer exists is refused', async () => {
    Program.findById = jest.fn(() => selectable(null))
    const res = makeRes()
    await recordExpense(makeReq(chair, body({ program: PROG })), res)
    expect(res._status).toBe(400)
    expect(Expense.create).not.toHaveBeenCalled()
  })

  test('an expense not for a PPA is still allowed', async () => {
    const res = makeRes()
    await recordExpense(makeReq(chair, body({})), res)
    expect(Expense.create).toHaveBeenCalledWith(expect.objectContaining({ program: null, project: null, activity: null }))
  })
})

describe('linking an existing expense to a PPA', () => {
  const expenseDoc = (over = {}) => {
    const e = { _id: 'e1', title: 'Tarpaulin', amount: 1200, isVoided: false, program: null, project: null, activity: null, save: jest.fn().mockResolvedValue(), ...over }
    e.populate = jest.fn().mockImplementation(async () => { e.program = e.program && { title: 'Educational Assistance' }; return e })
    return e
  }

  test('the Chairperson links an old expense; the change is audit-logged', async () => {
    const e = expenseDoc()
    Expense.findById = jest.fn(() => ({ populate: jest.fn().mockResolvedValue(e) }))
    Program.findById = jest.fn(() => selectable({ _id: PROG }))
    const res = makeRes()
    await linkExpensePpa(makeReq(chair, { program: PROG }, { id: 'e1' }), res)
    expect(e.save).toHaveBeenCalled()
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'LINK_EXPENSE_PPA', details: expect.stringContaining('Educational Assistance') }))
    expect(res._json.message).toMatch(/Linked to Educational Assistance/)
  })

  test('a voided expense cannot be linked', async () => {
    Expense.findById = jest.fn(() => ({ populate: jest.fn().mockResolvedValue(expenseDoc({ isVoided: true })) }))
    const res = makeRes()
    await linkExpensePpa(makeReq(chair, { program: PROG }, { id: 'e1' }), res)
    expect(res._status).toBe(400)
  })
})

describe('event feedback', () => {
  const meeting = (date) => ({ _id: 'm1', title: 'KK Assembly', date, comments: [], save: jest.fn().mockResolvedValue() })

  test('a member can’t post before the event starts', async () => {
    Meeting.findById = jest.fn().mockResolvedValue(meeting(new Date(Date.now() + 3600e3)))
    const res = makeRes()
    await addComment(makeReq(kab, { text: 'Excited!' }, { id: 'm1' }), res)
    expect(res._status).toBe(400)
    expect(res._json.message).toMatch(/opens when the event starts/)
  })

  test('once it has started any member can post — even without checking in', async () => {
    const m = meeting(new Date(Date.now() - 600e3))
    m.comments.push = Array.prototype.push
    Meeting.findById = jest.fn()
      .mockResolvedValueOnce(m)
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue({ comments: [{ text: 'Great talk' }] }) })
    const res = makeRes()
    await addComment(makeReq(kab, { text: 'Great talk' }, { id: 'm1' }), res)
    expect(res._status).toBe(201)
    expect(m.comments[0]).toEqual(expect.objectContaining({ user: 'k1', text: 'Great talk' }))
  })

  test('feedback must be text', async () => {
    const res = makeRes()
    await addComment(makeReq(kab, { text: { $gt: '' } }, { id: 'm1' }), res)
    expect(res._status).toBe(400)
  })
})

describe('role rules', () => {
  test('Rewards and point awards are limited to the Chairperson and Secretary', () => {
    const fs = require('fs')
    for (const file of ['routes/rewardRoutes.js', 'routes/pointsRoutes.js']) {
      const src = fs.readFileSync(require.resolve(`../${file}`), 'utf8')
      expect(src).toMatch(/\['admin','sk_chairperson','sk_secretary'\]/)
      expect(src).not.toMatch(/sk_treasurer|sk_kagawad/)
    }
  })
})
