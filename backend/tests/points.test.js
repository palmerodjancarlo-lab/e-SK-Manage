// ============================================================
// File:    points.test.js
// Author:  Joyzel Saguid
// Group:   CapsG4 — Web Systems and Technologies 2
// Project: e-SK Manage — SK Youth Management System
// Test:    Points Controller — balance, history, leaderboard, award
// ============================================================

const httpMocks = require('node-mocks-http')

jest.mock('../models/Points')
jest.mock('../models/User')
jest.mock('../models/AuditLog')

const Points   = require('../models/Points')
const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

const { getMyPoints, getHistory, getLeaderboard, awardPoints } = require('../controllers/pointsController')

const makeReq = (body = {}, user = null) =>
  httpMocks.createRequest({ body, user })

const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json   = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}

const fakeKab = (id = 'kabid001', points = 0) => ({
  _id:id, role:'kabataan_user', firstName:'Joyzel', lastName:'Saguid',
  email:'joyzel@eskmanage.com', points,
})
const fakeSK = () => ({
  _id:'skid001', role:'sk_officer', firstName:'Mhervin', lastName:'Mabuti',
})

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

// ── GET MY POINTS ─────────────────────────────────────────────────────────────

describe('getMyPoints', () => {

  test('returns 0 balance when no records', async () => {
    Points.aggregate = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
    const req = makeReq({}, fakeKab())
    const res = makeRes()
    await getMyPoints(req, res)
    expect(res._json.balance).toBe(0)
  })

  test('sums earned points correctly', async () => {
    Points.aggregate = jest.fn()
      .mockResolvedValueOnce([{ total:30 }])
      .mockResolvedValueOnce([])
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
    const req = makeReq({}, fakeKab())
    const res = makeRes()
    await getMyPoints(req, res)
    expect(res._json.balance).toBe(30)
  })

  test('subtracts redeemed points from balance', async () => {
    Points.aggregate = jest.fn()
      .mockResolvedValueOnce([{ total:50 }])
      .mockResolvedValueOnce([{ total:10 }])
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
    const req = makeReq({}, fakeKab())
    const res = makeRes()
    await getMyPoints(req, res)
    expect(res._json.balance).toBe(40)
  })

  test('syncs User.points with the computed balance', async () => {
    Points.aggregate = jest.fn()
      .mockResolvedValueOnce([{ total:25 }])
      .mockResolvedValueOnce([])
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
    const kab = fakeKab('kabid001', 0)
    const req = makeReq({}, kab)
    const res = makeRes()
    await getMyPoints(req, res)
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(kab._id, { points:25 })
  })
})

// ── GET HISTORY ───────────────────────────────────────────────────────────────

describe('getHistory', () => {

  test('returns points history for current user', async () => {
    const history = [
      { _id:'p1', pointsEarned:10, type:'earned' },
      { _id:'p2', pointsEarned:20, type:'earned' },
    ]
    // Real controller: Points.find().populate().sort().limit()
    Points.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      limit:    jest.fn().mockResolvedValue(history),
    })
    const req = makeReq({}, fakeKab())
    const res = makeRes()
    await getHistory(req, res)
    expect(res._json.history.length).toBe(2)
  })

  test('returns empty array when no history', async () => {
    Points.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      limit:    jest.fn().mockResolvedValue([]),
    })
    const req = makeReq({}, fakeKab())
    const res = makeRes()
    await getHistory(req, res)
    expect(res._json.history).toEqual([])
  })
})

// ── GET LEADERBOARD ───────────────────────────────────────────────────────────

describe('getLeaderboard', () => {

  test('returns users sorted by points descending', async () => {
    const leaders = [
      { _id:'u3', firstName:'Dianne', points:80 },
      { _id:'u1', firstName:'Angel', points:50 },
      { _id:'u2', firstName:'Joyzel', points:30 },
    ]
    // Real controller: User.find({ role:'kabataan_user', isActive:true }).select().sort().limit()
    User.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort:   jest.fn().mockReturnThis(),
      limit:  jest.fn().mockResolvedValue(leaders),
    })
    const req = makeReq()
    const res = makeRes()
    await getLeaderboard(req, res)
    expect(res._json.leaderboard[0].points).toBe(80)
    expect(res._json.leaderboard[2].points).toBe(30)
  })

  test('queries kabataan_user with isActive:true', async () => {
    // Real controller uses { role:'kabataan_user', isActive:true }
    User.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort:   jest.fn().mockReturnThis(),
      limit:  jest.fn().mockResolvedValue([]),
    })
    const req = makeReq()
    const res = makeRes()
    await getLeaderboard(req, res)
    expect(User.find).toHaveBeenCalledWith({ role:'kabataan_user', isActive:true })
  })
})

// ── AWARD POINTS ──────────────────────────────────────────────────────────────

describe('awardPoints', () => {

  test('returns 400 if userId not provided', async () => {
    // Real controller: if (!userId || !points) return 400
    const req = makeReq({ points:10, reason:'test' }, fakeSK())
    const res = makeRes()
    await awardPoints(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('returns 400 if points not provided', async () => {
    const req = makeReq({ userId:'kabid001', reason:'test' }, fakeSK())
    const res = makeRes()
    await awardPoints(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('awards points and creates record', async () => {
    // Real controller: does NOT check 0/negative — just checks !points (falsy)
    // So points=25 → valid
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
    Points.create = jest.fn().mockResolvedValue({ _id:'pts001' })
    const req = makeReq({ userId:'kabid001', points:25, reason:'Outstanding' }, fakeSK())
    const res = makeRes()
    await awardPoints(req, res)
    expect(Points.create).toHaveBeenCalledWith(
      expect.objectContaining({ pointsEarned:25, type:'awarded' })
    )
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('kabid001', { $inc:{ points:25 } })
    expect(res._json.message).toMatch(/awarded/i)
  })

  test('returns 400 if points is 0 (falsy)', async () => {
    // points=0 is falsy → !points is true → 400
    const req = makeReq({ userId:'kabid001', points:0, reason:'test' }, fakeSK())
    const res = makeRes()
    await awardPoints(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})