// ============================================================
// File:    admin.test.js
// Author:  Angel Rose Dela Torre
// Group:   CapsG4 — Web Systems and Technologies 2
// Project: e-SK Manage — SK Youth Management System
// Test:    Admin Controller — users, roles, stats, SK applications
// ============================================================

const httpMocks = require('node-mocks-http')

jest.mock('../models/User')
jest.mock('../models/AuditLog')

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

// Real export name is createUser NOT createAccount
const {
  getUsers, createUser, updateRole,
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
  _id:'64abc001', firstName:'Dianne', lastName:'Mantala',
  email:'dianne@eskmanage.com', role:'kabataan_user',
  municipality:'Boac', barangay:'Agot',
  isActive:true, isVerified:true, points:0,
  save: jest.fn(),
  ...overrides,
})

const fakeAdmin = () => fakeUser({ _id:'64abc000', role:'admin', email:'admin@eskmanage.com' })

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

// ── GET USERS ─────────────────────────────────────────────────────────────────

describe('getUsers', () => {

  test('returns list of all users', async () => {
    const users = [fakeUser(), fakeUser({ email:'angel@eskmanage.com' })]
    // Real controller: User.find().sort({ createdAt:-1 }).select('-password')
    User.find = jest.fn().mockReturnValue({
      sort:   jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(users),
    })
    const req = makeReq()
    const res = makeRes()
    await getUsers(req, res)
    expect(res._json.users.length).toBe(2)
  })

  test('returns empty array when no users', async () => {
    User.find = jest.fn().mockReturnValue({
      sort:   jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([]),
    })
    const req = makeReq()
    const res = makeRes()
    await getUsers(req, res)
    expect(res._json.users).toEqual([])
  })
})

// ── CREATE USER (exported as createUser, NOT createAccount) ──────────────────

describe('createUser', () => {

  test('creates SK officer account successfully', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)
    User.create  = jest.fn().mockResolvedValue(
      fakeUser({ role:'sk_officer', position:'SK Chairperson', email:'mhervin@eskmanage.com' })
    )
    const req = makeReq({
      firstName:'Mhervin', lastName:'Mabuti', email:'mhervin@eskmanage.com',
      password:'pass1234', role:'sk_officer', position:'SK Chairperson',
      municipality:'Boac', barangay:'Agot',
    }, {}, fakeAdmin())
    const res = makeRes()
    await createUser(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res._json.user.role).toBe('sk_officer')
  })

  test('returns 400 if email already registered', async () => {
    User.findOne = jest.fn().mockResolvedValue(fakeUser())
    const req = makeReq({ firstName:'Joyzel', lastName:'Saguid', email:'joyzel@eskmanage.com', password:'pass', role:'sk_officer' }, {}, fakeAdmin())
    const res = makeRes()
    await createUser(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.message).toMatch(/already/i)
  })

  test('returns 400 if role is not sk_officer', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)
    const req = makeReq({ firstName:'Angel', lastName:'Dela Torre', email:'angel@eskmanage.com', password:'pass', role:'admin' }, {}, fakeAdmin())
    const res = makeRes()
    await createUser(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.message).toMatch(/SK Officer/i)
  })

  test('returns 400 if required fields are missing (no role)', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)
    // No role → not in allowedRoles → 400
    const req = makeReq({ firstName:'Dianne', lastName:'Mantala', email:'dianne2@eskmanage.com', password:'pass' }, {}, fakeAdmin())
    const res = makeRes()
    await createUser(req, res)
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

  test('returns 500 if update throws (e.g., invalid id)', async () => {
    // Real controller has no explicit 400 for missing role — it just tries the update
    // If role is undefined it will still call findByIdAndUpdate and might return null/error
    User.findByIdAndUpdate = jest.fn().mockResolvedValue(null)
    const req = makeReq({}, { id:'64abc001' }, fakeAdmin())
    const res = makeRes()
    await updateRole(req, res)
    // Controller will try user.email on null and throw 500
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────────

describe('toggleActive', () => {

  test('deactivates an active user', async () => {
    const user = fakeUser({ isActive:true })
    user.save  = jest.fn().mockResolvedValue(user)
    User.findById = jest.fn().mockResolvedValue(user)
    const req = makeReq({}, { id:user._id }, fakeAdmin())
    const res = makeRes()
    await toggleActive(req, res)
    expect(user.isActive).toBe(false)
    expect(user.save).toHaveBeenCalled()
  })

  test('re-activates an inactive user', async () => {
    const user = fakeUser({ isActive:false })
    user.save  = jest.fn().mockResolvedValue(user)
    User.findById = jest.fn().mockResolvedValue(user)
    const req = makeReq({}, { id:user._id }, fakeAdmin())
    const res = makeRes()
    await toggleActive(req, res)
    expect(user.isActive).toBe(true)
  })

  test('returns 500 if user not found (null.isActive throws)', async () => {
    // Real controller: const user = await User.findById(...); user.isActive = !user.isActive
    // If user is null, this throws → caught → 500
    User.findById = jest.fn().mockResolvedValue(null)
    const req = makeReq({}, { id:'nonexistent' }, fakeAdmin())
    const res = makeRes()
    await toggleActive(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
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

  test('still calls delete even without id (deletes undefined)', async () => {
    // Real controller has no guard for missing id — just calls findByIdAndDelete(undefined)
    User.findByIdAndDelete = jest.fn().mockResolvedValue(null)
    const req = makeReq({}, {}, fakeAdmin())
    const res = makeRes()
    await deleteUser(req, res)
    // No id → findByIdAndDelete(undefined) → resolves → 200
    expect(res._json.message).toMatch(/deleted/i)
  })
})

// ── GET STATS ─────────────────────────────────────────────────────────────────

describe('getStats', () => {

  test('returns correct stats object with all fields', async () => {
    // Real controller: Promise.all([countDocuments(), countDocuments({isActive:true}),
    //   countDocuments({isVerified:false}), countDocuments({skApplication...})])
    // Returns: { totalUsers, activeUsers, pendingUsers, pendingApplications }
    User.countDocuments = jest.fn()
      .mockResolvedValueOnce(10)  // totalUsers
      .mockResolvedValueOnce(8)   // activeUsers
      .mockResolvedValueOnce(0)   // pendingUsers (isVerified:false)
      .mockResolvedValueOnce(2)   // pendingApplications
    const req = makeReq()
    const res = makeRes()
    await getStats(req, res)
    expect(res._json.stats.totalUsers).toBe(10)
    expect(res._json.stats.activeUsers).toBe(8)
    expect(res._json.stats.pendingApplications).toBe(2)
  })
})