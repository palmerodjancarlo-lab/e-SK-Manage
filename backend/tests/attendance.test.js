// ============================================================
// File:    attendance.test.js
// Test:    Event attendance — officer "mark present", undoing a check-in,
//          audit-logged attendance sheets and the period summary.
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/Meeting')
jest.mock('../models/Activity')
jest.mock('../models/User')
jest.mock('../models/Points')
jest.mock('../models/AuditLog')
jest.mock('../models/Announcement')

const Meeting  = require('../models/Meeting')
const Activity = require('../models/Activity')
const User     = require('../models/User')
const Points   = require('../models/Points')
const AuditLog = require('../models/AuditLog')
const { markPresent, removeCheckIn, getAttendanceSheet, getAttendanceSummary } = require('../controllers/meetingController')

const sec = { _id: 's1', firstName: 'Juan', lastName: 'Dela Cruz', role: 'sk_secretary' }
const makeReq = (body = {}, params = {}, query = {}) => httpMocks.createRequest({ user: sec, body, params, query, headers: {} })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}
const meeting = (checkedIn = []) => ({ _id: 'm1', title: 'Coastal Clean-up', type: 'Event', pointsReward: 20, checkedIn })
const kab = (over = {}) => ({ _id: 'k1', role: 'kabataan', firstName: 'Ana', lastName: 'Cruz', isActive: true, idVerified: true, ...over })
// a chainable populate() query that resolves to `value`
const populated = (value) => { const q = Promise.resolve(value); q.populate = jest.fn(() => q); q.sort = jest.fn(() => q); return q }

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
  Points.create = jest.fn().mockResolvedValue({})
  User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
})

describe('markPresent', () => {
  test('an officer marks a member present — recorded as manual, points credited', async () => {
    Meeting.findById = jest.fn().mockResolvedValue(meeting())
    User.findById = jest.fn().mockResolvedValue(kab())
    Meeting.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'm1' })
    const res = makeRes()
    await markPresent(makeReq({ userId: 'k1' }, { id: 'm1' }), res)
    expect(Meeting.findOneAndUpdate.mock.calls[0][1].$push.checkedIn).toEqual(expect.objectContaining({ user: 'k1', method: 'manual', markedBy: 's1' }))
    expect(Points.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'earned', pointsEarned: 20 }))
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('k1', { $inc: { points: 20 } })
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'MANUAL_CHECKIN' }))
    expect(res._status).toBe(201)
  })

  test('an unverified member is marked present with points held', async () => {
    Meeting.findById = jest.fn().mockResolvedValue(meeting())
    User.findById = jest.fn().mockResolvedValue(kab({ idVerified: false }))
    Meeting.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'm1' })
    const res = makeRes()
    await markPresent(makeReq({ userId: 'k1' }, { id: 'm1' }), res)
    expect(Points.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'held' }))
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled()
    expect(res._json.pointsHeld).toBe(true)
  })

  test('someone already on the list is not counted twice', async () => {
    Meeting.findById = jest.fn().mockResolvedValue(meeting([{ user: 'k1' }]))
    User.findById = jest.fn().mockResolvedValue(kab())
    Meeting.findOneAndUpdate = jest.fn()
    const res = makeRes()
    await markPresent(makeReq({ userId: 'k1' }, { id: 'm1' }), res)
    expect(res._status).toBe(400)
    expect(Meeting.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('SK officers cannot be marked present for points', async () => {
    Meeting.findById = jest.fn().mockResolvedValue(meeting())
    User.findById = jest.fn().mockResolvedValue({ _id: 'o1', role: 'sk_treasurer', isActive: true })
    const res = makeRes()
    await markPresent(makeReq({ userId: 'o1' }, { id: 'm1' }), res)
    expect(res._status).toBe(400)
    expect(Points.create).not.toHaveBeenCalled()
  })
})

describe('removeCheckIn', () => {
  test('takes the member off the list and takes back credited points', async () => {
    Meeting.findOneAndUpdate = jest.fn().mockResolvedValue(meeting())
    Points.findOneAndDelete = jest.fn().mockResolvedValue({ type: 'earned', pointsEarned: 20 })
    User.findById = jest.fn(() => ({ select: jest.fn().mockResolvedValue(kab()) }))
    const res = makeRes()
    await removeCheckIn(makeReq({}, { id: 'm1', userId: 'k1' }), res)
    expect(Meeting.findOneAndUpdate.mock.calls[0][1]).toEqual({ $pull: { checkedIn: { user: 'k1' } } })
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('k1', { $inc: { points: -20 } })
  })

  test('held points are just deleted (they were never in the balance)', async () => {
    Meeting.findOneAndUpdate = jest.fn().mockResolvedValue(meeting())
    Points.findOneAndDelete = jest.fn().mockResolvedValue({ type: 'held', pointsEarned: 20 })
    User.findById = jest.fn(() => ({ select: jest.fn().mockResolvedValue(kab()) }))
    const res = makeRes()
    await removeCheckIn(makeReq({}, { id: 'm1', userId: 'k1' }), res)
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled()
  })
})

describe('attendance sheets', () => {
  test('the sheet lists attendees A–Z with age, and the download is audit-logged', async () => {
    const m = {
      ...meeting(), date: new Date('2026-10-15T09:00:00+08:00'), venue: 'Tawiran Beach',
      checkedIn: [
        { user: { _id: 'k2', firstName: 'Paolo', lastName: 'Ramos', purok: 'Purok 2', sex: 'Male', birthDate: '2006-10-16', idVerified: true }, checkedInAt: new Date(), method: 'qr' },
        { user: { _id: 'k1', firstName: 'Ana', lastName: 'Cruz', purok: 'Purok 1', sex: 'Female', birthDate: '2004-01-01', idVerified: false }, checkedInAt: new Date(), method: 'manual' },
      ],
      rsvp: [],
    }
    Meeting.findById = jest.fn(() => populated(m))
    const res = makeRes()
    await getAttendanceSheet(makeReq({}, { id: 'm1' }), res)
    const [a, b] = res._json.attendees
    expect(a).toEqual(expect.objectContaining({ name: 'Cruz, Ana', age: 22, verified: false, method: 'manual' }))
    expect(b).toEqual(expect.objectContaining({ name: 'Ramos, Paolo', age: 19 })) // turns 20 the day after
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'EXPORT_ATTENDANCE' }))
  })

  test('the summary counts each member’s events and activities in the period', async () => {
    const u1 = { _id: 'k1', firstName: 'Ana', lastName: 'Cruz', idVerified: true }
    const u2 = { _id: 'k2', firstName: 'Paolo', lastName: 'Ramos', idVerified: true }
    Meeting.find = jest.fn(() => populated([{ _id: 'm1', title: 'Session', type: 'Meeting', date: new Date('2026-10-02'), checkedIn: [{ user: u1 }, { user: u2 }] }]))
    Activity.find = jest.fn(() => populated([{ _id: 'a1', title: 'League', type: 'Sports', startDate: new Date('2026-10-05'), attendance: [{ user: u1, daysAttended: 2 }, { user: u2, daysAttended: 0 }] }]))
    const res = makeRes()
    await getAttendanceSummary(makeReq({}, {}, { from: '2026-10-01', to: '2026-10-31' }), res)
    expect(res._json.events.map((e) => [e.title, e.count])).toEqual([['Session', 2], ['League', 1]])
    expect(res._json.members[0]).toEqual(expect.objectContaining({ name: 'Cruz, Ana', attended: ['m1', 'a1'] }))
    expect(res._json.members[1].attended).toEqual(['m1'])
    expect(AuditLog.create).not.toHaveBeenCalled() // viewing isn't logged; only ?export=1
  })
})
