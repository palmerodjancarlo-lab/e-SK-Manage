// ============================================================
// File:    security.test.js
// Test:    Phase 1 security hardening — code-guess lockout, query-operator
//          injection, member-data exposure, atomic check-in, error responses,
//          and auth rate limiting.
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/User')
jest.mock('../models/AuditLog')
jest.mock('../models/Meeting')
jest.mock('../models/Points')
jest.mock('../models/Announcement')

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')
const Meeting  = require('../models/Meeting')
const Points   = require('../models/Points')

const { login, verifyEmail, resetPassword, getMembers } = require('../controllers/authController')
const { checkIn } = require('../controllers/meetingController')
const serverError = require('../utils/serverError')

const makeReq = (body = {}, user = null, query = {}) => httpMocks.createRequest({ body, user, query })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}
// Mongoose-style query: awaitable and chainable with .select()/.sort()
const query = (value) => {
  const q = Promise.resolve(value)
  q.select = jest.fn(() => q)
  q.sort   = jest.fn(() => q)
  q.lean   = jest.fn(() => q)
  return q
}

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

// ── Emailed code lockout ──────────────────────────────────────────────────────

const pendingUser = (overrides = {}) => ({
  _id: 'u1', email: 'kab@example.com', isVerified: false,
  verificationCode: '123456', verificationExpires: new Date(Date.now() + 60_000),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
})

describe('verifyEmail', () => {
  test('rejects a query-operator object as email without querying', async () => {
    const res = makeRes()
    await verifyEmail(makeReq({ email: { $ne: null }, code: '123456' }), res)
    expect(res._status).toBe(400)
    expect(User.findOne).not.toHaveBeenCalled()
  })

  test('wrong code reports how many attempts are left', async () => {
    User.findOne = jest.fn(() => query(pendingUser()))
    User.findByIdAndUpdate = jest.fn(() => query({ verificationAttempts: 2 }))
    const res = makeRes()
    await verifyEmail(makeReq({ email: 'kab@example.com', code: '000000' }), res)
    expect(res._status).toBe(400)
    expect(res._json.message).toBe('Incorrect code. 3 attempts left.')
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { $inc: { verificationAttempts: 1 } }, { new: true })
  })

  test('discards the code once attempts exceed the limit — even a correct guess', async () => {
    User.findOne = jest.fn(() => query(pendingUser()))
    User.findByIdAndUpdate = jest.fn()
      .mockReturnValueOnce(query({ verificationAttempts: 6 }))
      .mockReturnValueOnce(query({}))
    const res = makeRes()
    await verifyEmail(makeReq({ email: 'kab@example.com', code: '123456' }), res)
    expect(res._status).toBe(429)
    expect(res._json.codeExpired).toBe(true)
    expect(User.findByIdAndUpdate).toHaveBeenLastCalledWith('u1', {
      $unset: { verificationCode: 1, verificationExpires: 1 },
      $set: { verificationAttempts: 0 },
    })
  })

  test('correct code within the limit verifies and resets the counter', async () => {
    const user = pendingUser()
    User.findOne = jest.fn(() => query(user))
    User.findByIdAndUpdate = jest.fn(() => query({ verificationAttempts: 1 }))
    const res = makeRes()
    await verifyEmail(makeReq({ email: 'KAB@example.com ', code: ' 123456 ' }), res)
    expect(User.findOne).toHaveBeenCalledWith({ email: 'kab@example.com' })
    expect(user.isVerified).toBe(true)
    expect(user.verificationAttempts).toBe(0)
    expect(user.save).toHaveBeenCalled()
    expect(res._json.token).toBeDefined()
  })
})

describe('resetPassword', () => {
  const resetUser = () => ({
    _id: 'u2', email: 'chair@example.com',
    resetCode: '654321', resetExpires: new Date(Date.now() + 60_000),
    save: jest.fn().mockResolvedValue(true),
  })

  test('rejects a non-string code', async () => {
    const res = makeRes()
    await resetPassword(makeReq({ email: 'chair@example.com', code: { $gt: '' }, newPassword: 'newpass1' }), res)
    expect(res._status).toBe(400)
    expect(User.findOne).not.toHaveBeenCalled()
  })

  test('locks the reset code after too many wrong guesses', async () => {
    const user = resetUser()
    User.findOne = jest.fn(() => query(user))
    User.findByIdAndUpdate = jest.fn()
      .mockReturnValueOnce(query({ resetAttempts: 6 }))
      .mockReturnValueOnce(query({}))
    const res = makeRes()
    await resetPassword(makeReq({ email: 'chair@example.com', code: '654321', newPassword: 'newpass1' }), res)
    expect(res._status).toBe(429)
    expect(user.save).not.toHaveBeenCalled()
  })

  test('valid code sets the new password and clears the counter', async () => {
    const user = resetUser()
    User.findOne = jest.fn(() => query(user))
    User.findByIdAndUpdate = jest.fn(() => query({ resetAttempts: 1 }))
    const res = makeRes()
    await resetPassword(makeReq({ email: 'chair@example.com', code: '654321', newPassword: 'newpass1' }), res)
    expect(user.password).toBe('newpass1')
    expect(user.resetAttempts).toBe(0)
    expect(user.resetCode).toBeUndefined()
    expect(user.save).toHaveBeenCalled()
  })
})

describe('login', () => {
  test('rejects a query-operator object as email without querying', async () => {
    const res = makeRes()
    await login(makeReq({ email: { $gt: '' }, password: 'x' }), res)
    expect(res._status).toBe(400)
    expect(User.findOne).not.toHaveBeenCalled()
  })
})

// ── Member roster exposure ────────────────────────────────────────────────────

describe('getMembers', () => {
  test('kabataan only receive the officials directory', async () => {
    const q = query([{ firstName: 'Chair' }])
    User.find = jest.fn(() => q)
    const res = makeRes()
    await getMembers(makeReq({}, { role: 'kabataan' }, { role: 'kabataan' }), res)

    const filter = User.find.mock.calls[0][0]
    expect(filter.role.$in).not.toContain('kabataan')
    expect(filter.isActive).toBe(true)
    const fields = q.select.mock.calls[0][0]
    for (const hidden of ['address', 'birthDate', 'isPWD', 'purok', 'civilStatus']) {
      expect(fields).not.toContain(hidden)
    }
  })

  test("an official's email and phone are left out when they chose to hide them", async () => {
    User.find = jest.fn(() => query([
      { firstName: 'Chair', email: 'chair@x.ph', contactNumber: '0917', showContact: true },
      { firstName: 'Sec', email: 'sec@x.ph', contactNumber: '0918', showContact: false },
    ]))
    const res = makeRes()
    await getMembers(makeReq({}, { role: 'kabataan' }), res)
    const [chair, sec] = res._json.users
    expect(chair).toEqual(expect.objectContaining({ email: 'chair@x.ph', contactNumber: '0917' }))
    expect(sec.email).toBeUndefined()
    expect(sec.contactNumber).toBeUndefined()
    expect(sec.firstName).toBe('Sec')
  })

  test('SK officials still receive the full roster', async () => {
    const q = query([])
    User.find = jest.fn(() => q)
    const res = makeRes()
    await getMembers(makeReq({}, { role: 'sk_secretary' }, { role: 'kabataan' }), res)
    expect(User.find).toHaveBeenCalledWith({ role: 'kabataan' })
    expect(q.select.mock.calls[0][0]).toContain('address')
  })
})

// ── QR check-in ───────────────────────────────────────────────────────────────

describe('checkIn', () => {
  const kab = { _id: 'k1', role: 'kabataan', firstName: 'Ana', lastName: 'Cruz', isActive: true, idVerified: true }
  const activeMeeting = (checkedIn = []) => ({
    _id: 'm1', title: 'Clean-up Drive', type: 'Event', pointsReward: 15,
    qrActive: true, qrExpiry: new Date(Date.now() + 60_000), checkedIn,
  })

  test('rejects a query-operator object as token without querying', async () => {
    const res = makeRes()
    await checkIn(makeReq({ qrToken: { $ne: null } }, kab), res)
    expect(res._status).toBe(400)
    expect(Meeting.findOne).not.toHaveBeenCalled()
  })

  test('SK officers do not check in for points', async () => {
    Meeting.findOne = jest.fn().mockResolvedValue(activeMeeting())
    Meeting.findOneAndUpdate = jest.fn()
    const res = makeRes()
    await checkIn(makeReq({ qrToken: 'tok' }, { _id: 's1', role: 'sk_secretary', firstName: 'Mia', lastName: 'R' }), res)
    expect(res._status).toBe(403)
    expect(Meeting.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('an unverified member can check in; the points are held, not added to the balance', async () => {
    Meeting.findOne = jest.fn().mockResolvedValue(activeMeeting())
    Meeting.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'm1' })
    Points.create = jest.fn().mockResolvedValue({})
    User.findByIdAndUpdate = jest.fn()
    const res = makeRes()
    await checkIn(makeReq({ qrToken: 'tok' }, { ...kab, idVerified: false }), res)
    expect(Meeting.findOneAndUpdate).toHaveBeenCalled()                 // attendance recorded
    expect(Points.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'held', pointsEarned: 15 }))
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled()               // balance untouched
    expect(res._json.pointsHeld).toBe(true)
    expect(res._json.message).toMatch(/verifies your residency/)
  })

  test('PWD members get the priority bonus on check-in', async () => {
    Meeting.findOne = jest.fn().mockResolvedValue(activeMeeting())
    Meeting.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'm1' })
    Points.create = jest.fn().mockResolvedValue({})
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
    const res = makeRes()
    await checkIn(makeReq({ qrToken: 'tok' }, { ...kab, isPWD: true }), res)
    expect(res._json.pointsAwarded).toBe(23) // 15 × 1.5, rounded
  })

  test('awards points exactly once when the atomic claim succeeds', async () => {
    Meeting.findOne = jest.fn().mockResolvedValue(activeMeeting())
    Meeting.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'm1' })
    Points.create = jest.fn().mockResolvedValue({})
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
    const res = makeRes()
    await checkIn(makeReq({ qrToken: 'tok' }, kab), res)

    expect(Meeting.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: 'm1', 'checkedIn.user': { $ne: 'k1' } })
    expect(Points.create).toHaveBeenCalledTimes(1)
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('k1', { $inc: { points: 15 } })
    expect(res._json.pointsAwarded).toBe(15)
  })

  test('a parallel duplicate that loses the claim gets no points', async () => {
    Meeting.findOne = jest.fn().mockResolvedValue(activeMeeting())
    Meeting.findOneAndUpdate = jest.fn().mockResolvedValue(null)
    Points.create = jest.fn()
    User.findByIdAndUpdate = jest.fn()
    const res = makeRes()
    await checkIn(makeReq({ qrToken: 'tok' }, kab), res)

    expect(res._status).toBe(400)
    expect(res._json.alreadyCheckedIn).toBe(true)
    expect(Points.create).not.toHaveBeenCalled()
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled()
  })
})

// ── Error responses ───────────────────────────────────────────────────────────

describe('serverError', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => console.error.mockRestore())

  test('unexpected errors return a generic message, not internals', () => {
    const res = makeRes()
    serverError(res, new Error('connect ECONNREFUSED 10.0.0.5:27017'))
    expect(res._status).toBe(500)
    expect(res._json.message).not.toMatch(/ECONNREFUSED/)
  })

  test('validation errors are client errors with the field message', () => {
    const res = makeRes()
    serverError(res, { name: 'ValidationError', errors: { password: { message: 'Password must be at least 6 characters' } } })
    expect(res._status).toBe(400)
    expect(res._json.message).toBe('Password must be at least 6 characters')
  })

  test('bad ids and duplicates map to 400 and 409', () => {
    const a = makeRes(); serverError(a, { name: 'CastError' })
    const b = makeRes(); serverError(b, { code: 11000 })
    expect(a._status).toBe(400)
    expect(b._status).toBe(409)
  })
})

// ── Rate limiting (real HTTP round-trips) ─────────────────────────────────────

describe('loginLimiter', () => {
  test('blocks an IP after 20 failed sign-ins and ignores successful ones', async () => {
    const express = require('express')
    const { loginLimiter } = require('../middleware/rateLimiters')
    const app = express()
    app.post('/login', loginLimiter, (req, res) =>
      (req.headers['x-ok'] ? res.json({ ok: true }) : res.status(401).json({ message: 'Invalid' })))
    const server = app.listen(0)
    const url = `http://127.0.0.1:${server.address().port}/login`

    try {
      for (let i = 0; i < 5; i++) await fetch(url, { method: 'POST', headers: { 'x-ok': '1' } })
      const statuses = []
      for (let i = 0; i < 21; i++) statuses.push((await fetch(url, { method: 'POST' })).status)

      expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true)
      expect(statuses[20]).toBe(429)
    } finally {
      server.close()
    }
  })
})
