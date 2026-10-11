// ============================================================
// File:    publishedBudget.test.js
// Test:    The budget figure the Chairperson shows kabataan — can't go below what was
//          spent, every change is audit-logged, kabataan never get the recorded totals.
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/Fund')
jest.mock('../models/Expense')
jest.mock('../models/Setting')
jest.mock('../models/AuditLog')

const Fund     = require('../models/Fund')
const Expense  = require('../models/Expense')
const Setting  = require('../models/Setting')
const AuditLog = require('../models/AuditLog')
const { setPublishedBudget, getSummary } = require('../controllers/financeController')

const chair = { _id: 'c1', firstName: 'Maria', lastName: 'Santos', role: 'sk_chairperson' }
const kab   = { _id: 'k1', firstName: 'Ana', lastName: 'Cruz', role: 'kabataan' }
const makeReq = (user, body = {}) => httpMocks.createRequest({ user, body, headers: {} })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}

let settings
beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
  // funds 100,000 recorded; 30,000 approved spending
  Fund.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 100000 }])
  Expense.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 30000 }])
  Expense.countDocuments = jest.fn().mockResolvedValue(0)
  settings = { publishedBudget: { amount: null }, save: jest.fn().mockResolvedValue() }
  Setting.findOne = jest.fn().mockResolvedValue(settings)
})

describe('setPublishedBudget', () => {
  test('refuses a figure lower than what has been spent', async () => {
    const res = makeRes()
    await setPublishedBudget(makeReq(chair, { amount: 20000 }), res)
    expect(res._status).toBe(400)
    expect(settings.save).not.toHaveBeenCalled()
    expect(AuditLog.create).not.toHaveBeenCalled()
  })

  test('saves it and logs old → new with the recorded funds', async () => {
    const res = makeRes()
    await setPublishedBudget(makeReq(chair, { amount: 80000, label: 'SK Fund FY 2026' }), res)
    expect(settings.publishedBudget).toEqual(expect.objectContaining({ amount: 80000, label: 'SK Fund FY 2026', updatedBy: 'c1' }))
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      action: 'PUBLISH_BUDGET',
      details: expect.stringMatching(/not published → ₱80,000.*Recorded funds at the time: ₱100,000/),
    }))
    expect(res._json.published.amount).toBe(80000)
  })

  test('null stops publishing', async () => {
    settings.publishedBudget = { amount: 80000, label: 'x' }
    const res = makeRes()
    await setPublishedBudget(makeReq(chair, { amount: null }), res)
    expect(settings.publishedBudget.amount).toBeNull()
    expect(res._json.published).toBeNull()
  })
})

describe('getSummary for kabataan', () => {
  test('shows spending + published budget and remaining, never the recorded totals', async () => {
    Expense.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 30000 }])
    settings.publishedBudget = { amount: 80000, label: 'SK Fund', updatedAt: new Date() }
    const res = makeRes()
    await getSummary(makeReq(kab), res)
    expect(res._json.kabataanView).toBe(true)
    expect(res._json.published).toEqual(expect.objectContaining({ amount: 80000, remaining: 50000 }))
    expect(res._json.totalFunds).toBeUndefined()
    expect(res._json.balance).toBeUndefined()
  })
})
