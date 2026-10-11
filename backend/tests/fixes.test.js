// ============================================================
// File:    fixes.test.js
// Test:    Regression tests for fixed bugs — activity totals hook (Mongoose 9),
//          fund edit whitelist, zero-point attendance, meeting minutes.
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/Fund')
jest.mock('../models/AuditLog')
jest.mock('../models/Activity', () => {
  const actual = jest.requireActual('../models/Activity')
  const M = jest.fn()
  M.schema = actual.schema
  return M
})
jest.mock('../models/User')
jest.mock('../models/Points')
jest.mock('../models/Meeting')

const Fund     = require('../models/Fund')
const AuditLog = require('../models/AuditLog')
const Activity = require('../models/Activity')
const User     = require('../models/User')
const Points   = require('../models/Points')
const Meeting  = require('../models/Meeting')
const { editFund } = require('../controllers/financeController')
const { recordAttendance } = require('../controllers/programController')
const { saveMinutes, getMeetings } = require('../controllers/meetingController')

const chair = { _id: 'c1', firstName: 'Maria', lastName: 'Santos', role: 'sk_chairperson' }
const makeReq = (user, body = {}, params = {}) => httpMocks.createRequest({ user, body, params, headers: {} })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

describe('Activity totals hook', () => {
  test('computes totalDays and totalPoints on save without a next() callback', async () => {
    const real = jest.requireActual('../models/Activity')
    const a = new real({
      project: '64b000000000000000000001', program: '64b000000000000000000002', title: 'League',
      startDate: new Date('2026-10-01'), endDate: new Date('2026-10-03'), pointsPerDay: 5,
      createdBy: '64b000000000000000000003',
    })
    await real.schema.s.hooks.execPre('save', a, [])
    expect(a.totalDays).toBe(3)
    expect(a.totalPoints).toBe(15)
  })
})

describe('editFund', () => {
  test('changes the fund details only — never its void state, recorder or edit history', async () => {
    const fund = {
      _id: 'f1', source: 'Barangay', amount: 1000, isVoided: false, recordedBy: 'c1',
      editHistory: [{ changes: 'first edit' }], save: jest.fn().mockResolvedValue(),
    }
    fund.editHistory.push = Array.prototype.push
    Fund.findById = jest.fn().mockResolvedValue(fund)
    const res = makeRes()
    await editFund(makeReq(chair, { amount: 1500, isVoided: true, recordedBy: 'attacker', editHistory: [] }, { id: 'f1' }), res)
    expect(fund.amount).toBe(1500)
    expect(fund.isVoided).toBe(false)
    expect(fund.recordedBy).toBe('c1')
    expect(fund.editHistory).toHaveLength(2) // the old entry survives and the new one is added
    expect(fund.editHistory[1].changes).toMatch(/Amount: ₱1000 → ₱1500/)
  })
})

describe('recordAttendance', () => {
  test('a 0-point activity records attendance without a (min 1) points row', async () => {
    const activity = { _id: 'a1', title: 'Orientation', totalDays: 1, totalPoints: 0, attendance: [], save: jest.fn().mockResolvedValue() }
    activity.attendance.find = Array.prototype.find
    Activity.findById = jest.fn().mockResolvedValue(activity)
    User.findById = jest.fn().mockResolvedValue({ _id: 'k1', role: 'kabataan', isActive: true, idVerified: true, firstName: 'Ana', lastName: 'Cruz' })
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
    Points.create = jest.fn()
    const res = makeRes()
    await recordAttendance(makeReq(chair, { userId: 'k1', daysAttended: 1 }, { id: 'a1' }), res)
    expect(res._status).toBe(201)
    expect(Points.create).not.toHaveBeenCalled()
  })

  test('rejects a negative day count', async () => {
    Activity.findById = jest.fn()
    const res = makeRes()
    await recordAttendance(makeReq(chair, { userId: 'k1', daysAttended: -2 }, { id: 'a1' }), res)
    expect(res._status).toBe(400)
    expect(Activity.findById).not.toHaveBeenCalled()
  })
})

describe('meeting minutes', () => {
  test('the Secretary saves minutes and it is audit-logged', async () => {
    const meeting = { _id: 'm1', title: 'SK Regular Session', minutes: {}, save: jest.fn().mockResolvedValue(), populate: jest.fn().mockResolvedValue() }
    Meeting.findById = jest.fn().mockResolvedValue(meeting)
    const sec = { _id: 's1', firstName: 'Juan', lastName: 'Dela Cruz', role: 'sk_secretary' }
    const res = makeRes()
    await saveMinutes(makeReq(sec, { text: '  Call to order 9:00 AM.  ', attendees: 'All officers' }, { id: 'm1' }), res)
    expect(meeting.minutes).toEqual(expect.objectContaining({ text: 'Call to order 9:00 AM.', attendees: 'All officers', recordedBy: 's1' }))
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'RECORD_MINUTES' }))
  })

  test('kabataan never receive the minutes', async () => {
    const doc = { toObject: () => ({ _id: 'm1', title: 'Session', qrToken: 'secret', minutes: { text: 'internal' } }) }
    const q = { populate: jest.fn(() => q), sort: jest.fn().mockResolvedValue([doc]) }
    Meeting.find = jest.fn(() => q)
    const res = makeRes()
    await getMeetings(makeReq({ _id: 'k1', role: 'kabataan' }), res)
    expect(res._json.meetings[0].minutes).toBeUndefined()
    expect(res._json.meetings[0].qrToken).toBeUndefined()
  })
})
