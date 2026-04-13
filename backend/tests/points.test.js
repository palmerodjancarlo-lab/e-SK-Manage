// tests/points.test.js
const httpMocks = require('node-mocks-http')

jest.mock('../models/Points')
jest.mock('../models/User')
jest.mock('../models/AuditLog')

const Points   = require('../models/Points')
const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

const {
  getMyPoints, getHistory, getLeaderboard, awardPoints,
} = require('../controllers/pointsController')

const makeReq = (body = {}, user = null) =>
  httpMocks.createRequest({ body, user })

const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json   = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}

const fakeKab = (id = 'kabid001', points = 0) => ({
  _id:id, role:'kabataan_user', firstName:'Kab', lastName:'User',
  email:'kab@test.com', points,
})

const fakeSK = () => ({
  _id:'skid001', role:'sk_officer', firstName:'SK', lastName:'Officer',
})

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

// ── GET MY POINTS ─────────────────────────────────────────────────────────────

describe('getMyPoints', () => {

  test('returns 0 balance when no records', async () => {
    Points.aggregate = jest.fn()
      .mockResolvedValueOnce([])  // earned
      .mockResolvedValueOnce([])  // redeemed
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})

    const req = makeReq({}, fakeKab())
    const res = makeRes()

    await getMyPoints(req, res)

    expect(res._json.balance).toBe(0)
  })

  test('sums earned points correctly', async () => {
    Points.aggregate = jest.fn()
      .mockResolvedValueOnce([{ total:30 }]) // earned
      .mockResolvedValueOnce([])              // redeemed
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})

    const req = makeReq({}, fakeKab())
    const res = makeRes()

    await getMyPoints(req, res)

    expect(res._json.balance).toBe(30)
  })

  test('subtracts redeemed points from balance', async () => {
    Points.aggregate = jest.fn()
      .mockResolvedValueOnce([{ total:50 }]) // earned
      .mockResolvedValueOnce([{ total:10 }]) // redeemed
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
    Points.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockResolvedValue(history),
    })

    const req = makeReq({}, fakeKab())
    const res = makeRes()

    await getHistory(req, res)

    expect(res._json.history.length).toBe(2)
  })

  test('returns empty array when no history', async () => {
    Points.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockResolvedValue([]),
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
      { _id:'u3', firstName:'C', points:80 },
      { _id:'u1', firstName:'A', points:50 },
      { _id:'u2', firstName:'B', points:30 },
    ]
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

  test('only queries kabataan_user role', async () => {
    User.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort:   jest.fn().mockReturnThis(),
      limit:  jest.fn().mockResolvedValue([]),
    })

    const req = makeReq()
    const res = makeRes()

    await getLeaderboard(req, res)

    expect(User.find).toHaveBeenCalledWith({ role:'kabataan_user' })
  })
})

// ── AWARD POINTS ──────────────────────────────────────────────────────────────

describe('awardPoints', () => {

  test('returns 400 if userId not provided', async () => {
    const req = makeReq({ points:10, reason:'test' }, fakeSK())
    const res = makeRes()

    await awardPoints(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('returns 400 if points is 0 or negative', async () => {
    const req = makeReq({ userId:'kabid001', points:-5, reason:'test' }, fakeSK())
    const res = makeRes()

    await awardPoints(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('returns 404 if target user not found', async () => {
    User.findById = jest.fn().mockResolvedValue(null)

    const req = makeReq({ userId:'nonexistent', points:10, reason:'test' }, fakeSK())
    const res = makeRes()

    await awardPoints(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  test('creates Points record and updates user balance', async () => {
    const kab = fakeKab()
    User.findById = jest.fn().mockResolvedValue(kab)
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
    Points.create = jest.fn().mockResolvedValue({ _id:'pts001' })

    const req = makeReq({ userId:kab._id, points:25, reason:'Outstanding' }, fakeSK())
    const res = makeRes()

    await awardPoints(req, res)

    expect(Points.create).toHaveBeenCalledWith(
      expect.objectContaining({ pointsEarned:25, type:'awarded' })
    )
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      kab._id,
      { $inc:{ points:25 } }
    )
    expect(res._json.message).toMatch(/awarded/i)
  })
})