// tests/admin.test.js
const httpMocks = require('node-mocks-http')

jest.mock('../models/User')
jest.mock('../models/AuditLog')

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

const {
  getUsers, createAccount, updateRole,
  toggleActive, deleteUser, getStats,
} = require('../controllers/adminController')

const makeReq = (body = {}, params = {}, user = null) =>
  httpMocks.createRequest({ body, params, user })

const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json   = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}

const fakeUser = (overrides = {}) => ({
  _id: '64abc001', firstName:'Test', lastName:'User',
  email:'test@test.com', role:'kabataan_user',
  municipality:'Boac', barangay:'Agot',
  isActive:true, isVerified:true, points:0,
  save: jest.fn(),
  ...overrides,
})

const fakeAdmin = () => fakeUser({ _id:'64abc000', role:'admin', email:'admin@test.com' })

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

// ── GET USERS ─────────────────────────────────────────────────────────────────

describe('getUsers', () => {

  test('returns list of all users', async () => {
    const users = [fakeUser(), fakeUser({ email:'b@test.com' })]
    User.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(users)
    })

    const req = makeReq()
    const res = makeRes()

    await getUsers(req, res)

    expect(res._json.users.length).toBe(2)
  })

  test('returns empty array when no users', async () => {
    User.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([])
    })

    const req = makeReq()
    const res = makeRes()

    await getUsers(req, res)

    expect(res._json.users).toEqual([])
  })
})

// ── CREATE ACCOUNT ────────────────────────────────────────────────────────────

describe('createAccount', () => {

  test('creates SK officer account successfully', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)
    User.create  = jest.fn().mockResolvedValue(
      fakeUser({ role:'sk_officer', position:'SK Chairperson', email:'new@test.com' })
    )

    const req = makeReq({
      firstName:'New', lastName:'Officer',
      email:'new@test.com', password:'pass1234',
      role:'sk_officer', position:'SK Chairperson',
      municipality:'Boac', barangay:'Agot',
    }, {}, fakeAdmin())
    const res = makeRes()

    await createAccount(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res._json.user.role).toBe('sk_officer')
  })

  test('returns 400 if email already registered', async () => {
    User.findOne = jest.fn().mockResolvedValue(fakeUser())

    const req = makeReq({
      firstName:'Dupe', lastName:'User',
      email:'taken@test.com', password:'pass',
      role:'sk_officer',
    }, {}, fakeAdmin())
    const res = makeRes()

    await createAccount(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.message).toMatch(/already/i)
  })

  test('returns 400 if role is not sk_officer', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)

    const req = makeReq({
      firstName:'Bad', lastName:'Role',
      email:'bad@test.com', password:'pass',
      role:'admin', // invalid
    }, {}, fakeAdmin())
    const res = makeRes()

    await createAccount(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('returns 400 if required fields are missing', async () => {
    const req = makeReq({ role:'sk_officer' }, {}, fakeAdmin())
    const res = makeRes()

    await createAccount(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ── UPDATE ROLE ───────────────────────────────────────────────────────────────

describe('updateRole', () => {

  test('updates role and returns updated user', async () => {
    const updated = fakeUser({ role:'sk_officer' })
    User.findByIdAndUpdate = jest.fn().mockResolvedValue(updated)

    const req = makeReq({ role:'sk_officer' }, { id:'64abc001' }, fakeAdmin())
    const res = makeRes()

    await updateRole(req, res)

    expect(res._json.user.role).toBe('sk_officer')
    expect(res._json.message).toMatch(/updated/i)
  })

  test('returns 400 if role not provided', async () => {
    const req = makeReq({}, { id:'64abc001' }, fakeAdmin())
    const res = makeRes()

    await updateRole(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────────

describe('toggleActive', () => {

  test('deactivates an active user', async () => {
    const user = fakeUser({ isActive:true })
    user.save  = jest.fn().mockResolvedValue({ ...user, isActive:false })
    User.findById = jest.fn().mockResolvedValue(user)

    const req = makeReq({}, { id:user._id }, fakeAdmin())
    const res = makeRes()

    await toggleActive(req, res)

    expect(user.isActive).toBe(false)
    expect(user.save).toHaveBeenCalled()
  })

  test('re-activates an inactive user', async () => {
    const user = fakeUser({ isActive:false })
    user.save  = jest.fn().mockResolvedValue({ ...user, isActive:true })
    User.findById = jest.fn().mockResolvedValue(user)

    const req = makeReq({}, { id:user._id }, fakeAdmin())
    const res = makeRes()

    await toggleActive(req, res)

    expect(user.isActive).toBe(true)
  })

  test('returns 404 if user not found', async () => {
    User.findById = jest.fn().mockResolvedValue(null)

    const req = makeReq({}, { id:'nonexistent' }, fakeAdmin())
    const res = makeRes()

    await toggleActive(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ── DELETE USER ───────────────────────────────────────────────────────────────

describe('deleteUser', () => {

  test('deletes user and returns success message', async () => {
    User.findByIdAndDelete = jest.fn().mockResolvedValue(fakeUser())

    const req = makeReq({}, { id:'64abc001' }, fakeAdmin())
    const res = makeRes()

    await deleteUser(req, res)

    expect(User.findByIdAndDelete).toHaveBeenCalledWith('64abc001')
    expect(res._json.message).toMatch(/deleted/i)
  })

  test('returns 400 if id not provided', async () => {
    const req = makeReq({}, {}, fakeAdmin())
    const res = makeRes()

    await deleteUser(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ── GET STATS ─────────────────────────────────────────────────────────────────

describe('getStats', () => {

  test('returns correct stats object', async () => {
    User.countDocuments = jest.fn()
      .mockResolvedValueOnce(10) // totalUsers
      .mockResolvedValueOnce(8)  // activeUsers
      .mockResolvedValueOnce(2)  // pendingApplications

    const req = makeReq()
    const res = makeRes()

    await getStats(req, res)

    expect(res._json.stats.totalUsers).toBe(10)
    expect(res._json.stats.activeUsers).toBe(8)
    expect(res._json.stats.pendingApplications).toBe(2)
  })
})