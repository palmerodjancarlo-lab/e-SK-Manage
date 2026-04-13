// tests/auth.test.js
// Tests for auth controller using jest mocks — no real DB needed

const httpMocks = require('node-mocks-http')
const jwt       = require('jsonwebtoken')

// ── Mock dependencies ────────────────────────────────────────────────────────
jest.mock('../models/User')
jest.mock('../models/AuditLog')

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

const {
  register, login, getProfile,
  updateProfile, changePassword, deleteAccount,
} = require('../controllers/authController')

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeReq = (body = {}, user = null) =>
  httpMocks.createRequest({ body, user })

const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json   = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}

const fakeUser = (overrides = {}) => ({
  _id:          '64abc123',
  firstName:    'Juan',
  lastName:     'Dela Cruz',
  email:        'juan@test.com',
  role:         'kabataan_user',
  municipality: 'Boac',
  barangay:     'Agot',
  isActive:     true,
  isVerified:   true,
  points:       0,
  password:     '$2a$10$hashedpassword',
  matchPassword: jest.fn(),
  save:          jest.fn(),
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

// ── REGISTER ─────────────────────────────────────────────────────────────────

describe('register', () => {

  test('returns 400 if required fields are missing', async () => {
    const req = makeReq({ email: 'incomplete@test.com' })
    const res = makeRes()

    await register(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.message).toMatch(/required/i)
  })

  test('returns 400 if email already exists', async () => {
    User.findOne = jest.fn().mockResolvedValue(fakeUser())

    const req = makeReq({
      firstName:'Juan', lastName:'DC',
      email:'taken@test.com', password:'pass123',
    })
    const res = makeRes()

    await register(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.message).toMatch(/already registered/i)
  })

  test('creates kabataan_user successfully', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)
    User.create  = jest.fn().mockResolvedValue(fakeUser({ email:'new@test.com' }))

    const req = makeReq({
      firstName:'Maria', lastName:'Santos',
      email:'new@test.com', password:'pass123',
      municipality:'Boac', barangay:'Agot',
    })
    const res = makeRes()

    await register(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res._json.user.email).toBe('new@test.com')
  })

  test('always forces role to kabataan_user', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)

    let createdData = null
    User.create = jest.fn().mockImplementation((data) => {
      createdData = data
      return Promise.resolve(fakeUser(data))
    })

    const req = makeReq({
      firstName:'Hacker', lastName:'User',
      email:'hack@test.com', password:'pass',
      role: 'admin', // attempt injection
    })
    const res = makeRes()

    await register(req, res)

    expect(createdData.role).toBe('kabataan_user')
  })

  test('saves SK application when isApplyingSK is true', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)

    let createdData = null
    User.create = jest.fn().mockImplementation((data) => {
      createdData = data
      return Promise.resolve(fakeUser({ ...data, skApplication:{ isApplying:true, status:'pending' } }))
    })

    const req = makeReq({
      firstName:'Pedro', lastName:'Reyes',
      email:'pedro@test.com', password:'pass123',
      isApplyingSK:true, appliedPosition:'SK Chairperson',
      proofDescription:'I was elected.',
    })
    const res = makeRes()

    await register(req, res)

    expect(createdData.skApplication.isApplying).toBe(true)
    expect(createdData.skApplication.status).toBe('pending')
    expect(res._json.hasSKApplication).toBe(true)
  })
})

// ── LOGIN ─────────────────────────────────────────────────────────────────────

describe('login', () => {

  test('returns 400 if email or password missing', async () => {
    const req = makeReq({ email: 'only@test.com' })
    const res = makeRes()

    await login(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('returns 401 if user not found', async () => {
    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    })

    const req = makeReq({ email:'nobody@test.com', password:'pass' })
    const res = makeRes()

    await login(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('returns 401 if password is wrong', async () => {
    const user = fakeUser()
    user.matchPassword = jest.fn().mockResolvedValue(false)

    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(user)
    })

    const req = makeReq({ email:'juan@test.com', password:'wrongpass' })
    const res = makeRes()

    await login(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res._json.message).toMatch(/invalid/i)
  })

  test('returns 403 if account is deactivated', async () => {
    const user = fakeUser({ isActive: false })
    user.matchPassword = jest.fn().mockResolvedValue(true)

    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(user)
    })

    const req = makeReq({ email:'juan@test.com', password:'pass' })
    const res = makeRes()

    await login(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res._json.message).toMatch(/deactivated/i)
  })

  test('returns token and user on success', async () => {
    const user = fakeUser()
    user.matchPassword = jest.fn().mockResolvedValue(true)

    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(user)
    })

    const req = makeReq({ email:'juan@test.com', password:'correctpass' })
    const res = makeRes()

    await login(req, res)

    expect(res._json.token).toBeDefined()
    expect(res._json.user.email).toBe('juan@test.com')
  })
})

// ── GET PROFILE ───────────────────────────────────────────────────────────────

describe('getProfile', () => {

  test('returns the current user profile', async () => {
    const user = fakeUser()
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(user)
    })

    const req = makeReq({}, user)
    const res = makeRes()

    await getProfile(req, res)

    expect(res._json.user.email).toBe('juan@test.com')
  })
})

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────

describe('updateProfile', () => {

  test('updates and returns the updated user', async () => {
    const user    = fakeUser()
    const updated = fakeUser({ firstName:'Updated', municipality:'Gasan' })

    User.findByIdAndUpdate = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(updated)
    })

    const req = makeReq({ firstName:'Updated', municipality:'Gasan' }, user)
    const res = makeRes()

    await updateProfile(req, res)

    expect(res._json.user.firstName).toBe('Updated')
    expect(res._json.user.municipality).toBe('Gasan')
  })
})

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────

describe('changePassword', () => {

  test('returns 400 if new password is too short', async () => {
    const user = fakeUser()
    user.matchPassword = jest.fn().mockResolvedValue(true)
    User.findById = jest.fn().mockResolvedValue(user)

    const req = makeReq({ currentPassword:'old', newPassword:'123' }, user)
    const res = makeRes()

    await changePassword(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('returns 401 if current password is wrong', async () => {
    const user = fakeUser()
    user.matchPassword = jest.fn().mockResolvedValue(false)
    User.findById = jest.fn().mockResolvedValue(user)

    const req = makeReq({ currentPassword:'wrong', newPassword:'newpass123' }, user)
    const res = makeRes()

    await changePassword(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('saves new password on success', async () => {
    const user = fakeUser()
    user.matchPassword = jest.fn().mockResolvedValue(true)
    user.save          = jest.fn().mockResolvedValue(user)
    User.findById      = jest.fn().mockResolvedValue(user)

    const req = makeReq({ currentPassword:'oldpass', newPassword:'newpass123' }, user)
    const res = makeRes()

    await changePassword(req, res)

    expect(user.save).toHaveBeenCalled()
    expect(res._json.message).toMatch(/changed/i)
  })
})

// ── DELETE ACCOUNT ────────────────────────────────────────────────────────────

describe('deleteAccount', () => {

  test('returns 400 if password not provided', async () => {
    const user = fakeUser()
    const req  = makeReq({}, user)
    const res  = makeRes()

    await deleteAccount(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('returns 403 if user is admin', async () => {
    const admin = fakeUser({ role:'admin' })
    admin.matchPassword = jest.fn().mockResolvedValue(true)
    User.findById = jest.fn().mockResolvedValue(admin)

    const req = makeReq({ password:'adminpass' }, admin)
    const res = makeRes()

    await deleteAccount(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res._json.message).toMatch(/cannot/i)
  })

  test('returns 401 if password is incorrect', async () => {
    const user = fakeUser()
    user.matchPassword = jest.fn().mockResolvedValue(false)
    User.findById = jest.fn().mockResolvedValue(user)

    const req = makeReq({ password:'wrongpass' }, user)
    const res = makeRes()

    await deleteAccount(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('deletes account on success', async () => {
    const user = fakeUser()
    user.matchPassword = jest.fn().mockResolvedValue(true)
    User.findById          = jest.fn().mockResolvedValue(user)
    User.findByIdAndDelete = jest.fn().mockResolvedValue(user)

    const req = makeReq({ password:'correctpass' }, user)
    const res = makeRes()

    await deleteAccount(req, res)

    expect(User.findByIdAndDelete).toHaveBeenCalledWith(user._id)
    expect(res._json.message).toMatch(/deleted/i)
  })
})