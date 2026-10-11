// ============================================================
// File:    admin.test.js
// Author:  Angel Rose Dela Torre
// Group:   CapsG4 — Web Systems and Technologies 2
// Project: e-SK Manage — SK Youth Management System
// Test:    Admin Controller — users, SK accounts, stats
// ============================================================

const httpMocks = require('node-mocks-http')

jest.mock('../models/User')
jest.mock('../models/AuditLog')
jest.mock('../utils/cleanupUser', () => jest.fn().mockResolvedValue())

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

const {
  getUsers, createSKAccount, bulkCreateSK, updateUser,
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
  email:'dianne@eskmanage.com', role:'kabataan',
  municipality:'Santa Cruz', barangay:'Tawiran',
  isActive:true, isVerified:true, points:0,
  save: jest.fn(),
  ...overrides,
})

const fakeAdmin = () => fakeUser({ _id:'64abc000', role:'sk_chairperson', email:'chair@eskmanage.com' })

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

// ── GET USERS ─────────────────────────────────────────────────────────────────

describe('getUsers', () => {

  test('returns list of all users', async () => {
    const users = [fakeUser(), fakeUser({ email:'angel@eskmanage.com' })]
    User.find = jest.fn().mockReturnValue({
      sort:   jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(users),
    })
    const res = makeRes()
    await getUsers(makeReq(), res)
    expect(res._json.users.length).toBe(2)
  })

  test('returns empty array when no users', async () => {
    User.find = jest.fn().mockReturnValue({
      sort:   jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([]),
    })
    const res = makeRes()
    await getUsers(makeReq(), res)
    expect(res._json.users).toEqual([])
  })
})

// ── CREATE SK ACCOUNT ─────────────────────────────────────────────────────────

describe('createSKAccount', () => {

  test('creates an SK officer account (email normalised)', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)
    User.create  = jest.fn().mockImplementation(async (d) => fakeUser({ ...d, _id:'64abc009' }))
    const req = makeReq({
      firstName:'Mhervin', lastName:'Mabuti', email:'  Mhervin@ESKmanage.com ',
      password:'pass1234', role:'sk_kagawad',
    }, {}, fakeAdmin())
    const res = makeRes()
    await createSKAccount(req, res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ email:'mhervin@eskmanage.com', role:'sk_kagawad' }))
  })

  test('returns 400 if email already registered', async () => {
    User.findOne = jest.fn().mockResolvedValue(fakeUser())
    const req = makeReq({ firstName:'Joyzel', lastName:'Saguid', email:'joyzel@eskmanage.com', password:'pass1234', role:'sk_kagawad' }, {}, fakeAdmin())
    const res = makeRes()
    await createSKAccount(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.message).toMatch(/already/i)
  })

  test('returns 400 for a role that is not an SK role', async () => {
    const req = makeReq({ firstName:'Angel', lastName:'Dela Torre', email:'angel@eskmanage.com', password:'pass1234', role:'admin' }, {}, fakeAdmin())
    const res = makeRes()
    await createSKAccount(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.message).toMatch(/invalid role/i)
  })

  test('refuses a second SK Treasurer', async () => {
    User.findOne = jest.fn()
      .mockResolvedValueOnce(null)                              // email is free
      .mockResolvedValueOnce(fakeUser({ role:'sk_treasurer' })) // role already filled
    User.create = jest.fn()
    const req = makeReq({ firstName:'Ana', lastName:'Reyes', email:'ana2@eskmanage.com', password:'pass1234', role:'sk_treasurer' }, {}, fakeAdmin())
    const res = makeRes()
    await createSKAccount(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(User.create).not.toHaveBeenCalled()
  })
})

describe('bulkCreateSK', () => {
  test('gives each account its own random temporary password when none is typed', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)
    User.create  = jest.fn().mockImplementation(async (d) => fakeUser({ ...d, _id: d.email }))
    const officers = [
      { firstName:'Jose', lastName:'Garcia', email:'jose@eskmanage.com', role:'sk_kagawad' },
      { firstName:'Carla', lastName:'Mendoza', email:'carla@eskmanage.com', role:'sk_kagawad' },
    ]
    const res = makeRes()
    await bulkCreateSK(makeReq({ officers }, {}, fakeAdmin()), res)
    const [a, b] = res._json.created
    expect(a.tempPassword).toMatch(/^sk-[0-9a-f]{10}$/)
    expect(b.tempPassword).toMatch(/^sk-[0-9a-f]{10}$/)
    expect(a.tempPassword).not.toBe(b.tempPassword)
    expect(User.create.mock.calls[0][0].password).toBe(a.tempPassword)
  })
})

// ── UPDATE USER ───────────────────────────────────────────────────────────────

describe('updateUser', () => {

  test('updates personal details only — never role, points or verification', async () => {
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser({ firstName:'Dian' })) })
    const req = makeReq({ firstName:'Dian', role:'sk_chairperson', points:9999, idVerified:true, password:'x' }, { id:'64abc001' }, fakeAdmin())
    const res = makeRes()
    await updateUser(req, res)
    expect(User.findByIdAndUpdate.mock.calls[0][1]).toEqual({ firstName:'Dian' })
    expect(res._json.message).toMatch(/updated/i)
  })

  test('returns 404 for an unknown user', async () => {
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) })
    const res = makeRes()
    await updateUser(makeReq({ firstName:'X' }, { id:'64abc001' }, fakeAdmin()), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────────

describe('toggleActive', () => {

  test('deactivates an active user', async () => {
    const user = fakeUser({ isActive:true })
    user.save  = jest.fn().mockResolvedValue(user)
    User.findById = jest.fn().mockResolvedValue(user)
    const res = makeRes()
    await toggleActive(makeReq({}, { id:user._id }, fakeAdmin()), res)
    expect(user.isActive).toBe(false)
    expect(user.save).toHaveBeenCalled()
  })

  test('re-activates an inactive user', async () => {
    const user = fakeUser({ isActive:false })
    user.save  = jest.fn().mockResolvedValue(user)
    User.findById = jest.fn().mockResolvedValue(user)
    const res = makeRes()
    await toggleActive(makeReq({}, { id:user._id }, fakeAdmin()), res)
    expect(user.isActive).toBe(true)
  })

  test('returns 404 if user not found', async () => {
    User.findById = jest.fn().mockResolvedValue(null)
    const res = makeRes()
    await toggleActive(makeReq({}, { id:'nonexistent' }, fakeAdmin()), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ── DELETE USER ───────────────────────────────────────────────────────────────

describe('deleteUser', () => {

  test('deletes user and returns success message', async () => {
    User.findByIdAndDelete = jest.fn().mockResolvedValue(fakeUser())
    const res = makeRes()
    await deleteUser(makeReq({}, { id:'64abc001' }, fakeAdmin()), res)
    expect(User.findByIdAndDelete).toHaveBeenCalledWith('64abc001')
    expect(res._json.message).toMatch(/deleted/i)
  })

  test('returns 404 when there is no such user', async () => {
    User.findByIdAndDelete = jest.fn().mockResolvedValue(null)
    const res = makeRes()
    await deleteUser(makeReq({}, {}, fakeAdmin()), res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(AuditLog.create).not.toHaveBeenCalled()
  })
})

// ── GET STATS ─────────────────────────────────────────────────────────────────

describe('getStats', () => {

  test('returns member, kabataan and officer counts', async () => {
    // total, active, kabataan, officials, male, female, PWD, verified
    User.countDocuments = jest.fn()
    for (const n of [10, 8, 6, 4, 3, 3, 1, 5]) User.countDocuments.mockResolvedValueOnce(n)
    const res = makeRes()
    await getStats(makeReq(), res)
    expect(res._json.stats).toEqual({
      totalUsers:10, activeUsers:8, kabataanCount:6, skOfficialCount:4,
      maleCount:3, femaleCount:3, pwdCount:1, verifiedCount:5,
    })
  })
})
