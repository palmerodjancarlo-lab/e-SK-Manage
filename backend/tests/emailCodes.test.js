// ============================================================
// File:    emailCodes.test.js
// Test:    Verification / reset codes — answered without waiting for Gmail, the same
//          code reused while valid (so slow or repeated emails all work), a resend wait,
//          and finishing an abandoned registration instead of "already registered".
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/User')
jest.mock('../models/AuditLog')
jest.mock('../utils/sendEmail', () => ({
  CODE_MINUTES: 15,
  sendVerificationEmail: jest.fn().mockResolvedValue({}),
  sendResetEmail: jest.fn().mockResolvedValue({}),
  sendEmailChangeCode: jest.fn().mockResolvedValue({}),
  sendEmailChangedNotice: jest.fn().mockResolvedValue({}),
}))
jest.mock('../utils/cleanupUser', () => jest.fn().mockResolvedValue())

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')
const mail     = require('../utils/sendEmail')
const { register, resendCode, forgotPassword } = require('../controllers/authController')

const makeReq = (body) => httpMocks.createRequest({ body, headers: {} })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}
const flush = () => new Promise((r) => setImmediate(r))
const found = (v) => ({ select: jest.fn().mockResolvedValue(v) })
const mins = (n) => new Date(Date.now() + n * 60000)
const pendingUser = (over = {}) => {
  const u = { _id: 'u1', email: 'ana@gmail.com', firstName: 'Ana', role: 'kabataan', isVerified: false, verificationAttempts: 2, ...over }
  u.save = jest.fn().mockResolvedValue(u)
  return u
}
const age20 = new Date(Date.now() - 20 * 365.25 * 864e5).toISOString().slice(0, 10)
const regBody = { firstName: 'Ana', lastName: 'Cruz', email: 'ana@gmail.com', password: 'secret123', purok: 'Purok 1', address: 'Purok 1, Tawiran', sex: 'Female', birthDate: age20 }

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

describe('register', () => {
  test('answers right away even if Gmail is slow (the email goes out in the background)', async () => {
    let finishEmail
    mail.sendVerificationEmail.mockImplementationOnce(() => new Promise((r) => { finishEmail = r }))
    User.findOne = jest.fn(() => found(null))
    User.create = jest.fn().mockImplementation(async (d) => ({ _id: 'u9', ...d }))
    const res = makeRes()
    await register(makeReq(regBody), res)
    expect(res.status).toHaveBeenCalledWith(201)          // didn't wait for the email
    expect(User.create.mock.calls[0][0].verificationExpires.getTime()).toBeGreaterThan(Date.now() + 14 * 60000)
    await flush(); finishEmail?.()
  })

  test('a registration that was never verified is finished, not refused, keeping the same code', async () => {
    const u = pendingUser({ verificationCode: '123456', verificationExpires: mins(10) })
    User.findOne = jest.fn(() => found(u))
    const res = makeRes()
    await register(makeReq(regBody), res)
    await flush()
    expect(res.status).toHaveBeenCalledWith(201)
    expect(u.save).toHaveBeenCalled()
    expect(u.verificationCode).toBe('123456')           // the code in the first email still works
    expect(mail.sendVerificationEmail).toHaveBeenCalledWith('ana@gmail.com', 'Ana', '123456')
  })

  test('a verified account is still protected', async () => {
    User.findOne = jest.fn(() => found(pendingUser({ isVerified: true })))
    const res = makeRes()
    await register(makeReq(regBody), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.message).toMatch(/already registered/)
  })
})

describe('resend code', () => {
  test('sends the SAME code again while it is still valid', async () => {
    const u = pendingUser({ verificationCode: '654321', verificationExpires: mins(12), verificationSentAt: new Date(Date.now() - 60000) })
    User.findOne = jest.fn(() => found(u))
    const res = makeRes()
    await resendCode(makeReq({ email: 'ana@gmail.com' }), res)
    await flush()
    expect(u.verificationCode).toBe('654321')
    expect(u.verificationAttempts).toBe(2)                // same code → same attempt count
    expect(res._json).toEqual(expect.objectContaining({ sameCode: true, retryAfter: 30 }))
    expect(mail.sendVerificationEmail).toHaveBeenCalledWith('ana@gmail.com', 'Ana', '654321')
  })

  test('makes a new code once the old one is about to expire', async () => {
    const u = pendingUser({ verificationCode: '111111', verificationExpires: mins(1), verificationSentAt: new Date(Date.now() - 60000) })
    User.findOne = jest.fn(() => found(u))
    const res = makeRes()
    await resendCode(makeReq({ email: 'ana@gmail.com' }), res)
    expect(u.verificationCode).not.toBe('111111')
    expect(u.verificationAttempts).toBe(0)
    expect(res._json.sameCode).toBe(false)
  })

  test('asks to wait when tapped again within 30 seconds — no extra email', async () => {
    const u = pendingUser({ verificationCode: '654321', verificationExpires: mins(12), verificationSentAt: new Date(Date.now() - 5000) })
    User.findOne = jest.fn(() => found(u))
    const res = makeRes()
    await resendCode(makeReq({ email: 'ana@gmail.com' }), res)
    await flush()
    expect(res._status).toBe(429)
    expect(res._json.retryAfter).toBeGreaterThan(20)
    expect(mail.sendVerificationEmail).not.toHaveBeenCalled()
  })
})

describe('forgot password', () => {
  test('reuses a still-valid reset code and does not resend within 30 seconds', async () => {
    const u = { _id: 'u1', email: 'ana@gmail.com', firstName: 'Ana', resetCode: '222222', resetExpires: mins(10), resetSentAt: new Date(Date.now() - 3000), save: jest.fn() }
    User.findOne = jest.fn(() => found(u))
    const res = makeRes()
    await forgotPassword(makeReq({ email: 'ana@gmail.com' }), res)
    await flush()
    expect(res._json.message).toMatch(/reset code is on the way/)
    expect(mail.sendResetEmail).not.toHaveBeenCalled()

    u.resetSentAt = new Date(Date.now() - 60000)
    await forgotPassword(makeReq({ email: 'ana@gmail.com' }), makeRes())
    await flush()
    expect(u.resetCode).toBe('222222')
    expect(mail.sendResetEmail).toHaveBeenCalledWith('ana@gmail.com', 'Ana', '222222')
  })
})
