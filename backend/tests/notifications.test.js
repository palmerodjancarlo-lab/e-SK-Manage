// ============================================================
// File:    notifications.test.js
// Test:    Residency verification notifies the kabataan (bell + email),
//          and members can only read their own notifications
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/User')
jest.mock('../models/AuditLog')
jest.mock('../models/Notification')
jest.mock('../utils/sendEmail')
jest.mock('../utils/heldPoints')

const User         = require('../models/User')
const AuditLog     = require('../models/AuditLog')
const Notification = require('../models/Notification')
const mail         = require('../utils/sendEmail')
const { releaseHeldPoints } = require('../utils/heldPoints')

const { verifyResidency } = require('../controllers/adminController')
const { getMyNotifications, markRead, markAllRead } = require('../controllers/notificationController')

const makeReq = (body = {}, user = null, extra = {}) => httpMocks.createRequest({ body, user, ...extra })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}
const query = (value) => {
  const q = Promise.resolve(value)
  q.select = jest.fn(() => q)
  q.sort = jest.fn(() => q)
  q.limit = jest.fn(() => q)
  q.lean = jest.fn(() => q)
  return q
}
const flush = () => new Promise((r) => setImmediate(r))

const head = { _id: 'h1', firstName: 'Maria', lastName: 'Santos', role: 'sk_chairperson' }
const kab  = { _id: '64b000000000000000000001', email: 'ana@example.com', firstName: 'Ana', lastName: 'Cruz', role: 'kabataan' }

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
  Notification.create = jest.fn().mockResolvedValue({})
  mail.sendResidencyVerifiedEmail.mockResolvedValue({})
  mail.sendResidencyRemovedEmail.mockResolvedValue({})
  releaseHeldPoints.mockResolvedValue({ count: 0, total: 0 })
})

describe('verifyResidency notifications', () => {
  const run = async (wasVerified, verified, user = kab) => {
    User.findById = jest.fn(() => query({ idVerified: wasVerified }))
    User.findByIdAndUpdate = jest.fn(() => query({ ...user, idVerified: verified }))
    const res = makeRes()
    await verifyResidency(makeReq({ verified }, head, { params: { id: user._id } }), res)
    await flush()
    return res
  }

  test('verifying sends an in-app notification and an email', async () => {
    const res = await run(false, true)
    expect(res._json.message).toBe('Resident verified.')
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ user: kab._id, type: 'RESIDENCY_VERIFIED' }))
    expect(mail.sendResidencyVerifiedEmail).toHaveBeenCalledWith('ana@example.com', 'Ana', 0)
  })

  test('verifying releases held check-in points and tells the member how many', async () => {
    releaseHeldPoints.mockResolvedValue({ count: 2, total: 25 })
    const res = await run(false, true)
    expect(releaseHeldPoints).toHaveBeenCalledWith(kab._id)
    expect(res._json.releasedPoints).toBe(25)
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('25 points') }))
    expect(mail.sendResidencyVerifiedEmail).toHaveBeenCalledWith('ana@example.com', 'Ana', 25)
  })

  test('removing verification releases nothing', async () => {
    await run(true, false)
    expect(releaseHeldPoints).not.toHaveBeenCalled()
  })

  test('removing verification notifies with the removal message', async () => {
    await run(true, false)
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'RESIDENCY_UNVERIFIED' }))
    expect(mail.sendResidencyRemovedEmail).toHaveBeenCalledWith('ana@example.com', 'Ana')
  })

  test('no duplicate notification when the status did not change', async () => {
    await run(true, true)
    expect(Notification.create).not.toHaveBeenCalled()
    expect(mail.sendResidencyVerifiedEmail).not.toHaveBeenCalled()
  })

  test('SK officials are not sent residency notifications', async () => {
    await run(false, true, { ...kab, role: 'sk_secretary' })
    expect(Notification.create).not.toHaveBeenCalled()
  })

  test('a failed email does not fail the verification', async () => {
    mail.sendResidencyVerifiedEmail.mockRejectedValue(new Error('SMTP down'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await run(false, true)
    expect(res.status).not.toHaveBeenCalled()
    expect(res._json.message).toBe('Resident verified.')
    spy.mockRestore()
  })

  test('unknown user returns 404 and notifies nobody', async () => {
    User.findById = jest.fn(() => query(null))
    const res = makeRes()
    await verifyResidency(makeReq({ verified: true }, head, { params: { id: 'missing' } }), res)
    expect(res._status).toBe(404)
    expect(Notification.create).not.toHaveBeenCalled()
  })
})

describe('notification endpoints are scoped to the signed-in user', () => {
  test('list returns own notifications and unread count', async () => {
    Notification.find = jest.fn(() => query([{ _id: 'n1' }]))
    Notification.countDocuments = jest.fn().mockResolvedValue(1)
    const res = makeRes()
    await getMyNotifications(makeReq({}, kab), res)
    expect(Notification.find).toHaveBeenCalledWith({ user: kab._id })
    expect(res._json).toEqual({ notifications: [{ _id: 'n1' }], unread: 1 })
  })

  test("marking read only matches the user's own notification", async () => {
    Notification.findOneAndUpdate = jest.fn().mockResolvedValue(null)
    const res = makeRes()
    await markRead(makeReq({}, kab, { params: { id: '64b0000000000000000000aa' } }), res)
    expect(Notification.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: '64b0000000000000000000aa', user: kab._id })
    expect(res._status).toBe(404)
  })

  test('invalid id is a 404, not a server error', async () => {
    Notification.findOneAndUpdate = jest.fn()
    const res = makeRes()
    await markRead(makeReq({}, kab, { params: { id: '{"$ne":null}' } }), res)
    expect(res._status).toBe(404)
    expect(Notification.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('mark all read only touches own unread notifications', async () => {
    Notification.updateMany = jest.fn().mockResolvedValue({})
    const res = makeRes()
    await markAllRead(makeReq({}, kab), res)
    expect(Notification.updateMany.mock.calls[0][0]).toEqual({ user: kab._id, readAt: null })
  })
})
