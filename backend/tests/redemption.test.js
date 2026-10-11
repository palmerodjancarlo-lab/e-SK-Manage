// ============================================================
// File:    redemption.test.js
// Test:    Reward redemption — request deducts points + reserves stock (first come,
//          first served); cancel/reject refund; claim records the hand-over.
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/Redemption')
jest.mock('../models/Reward')
jest.mock('../models/Points')
jest.mock('../models/User')
jest.mock('../models/AuditLog')
jest.mock('../models/Notification')

const Redemption   = require('../models/Redemption')
const Reward       = require('../models/Reward')
const Points       = require('../models/Points')
const User         = require('../models/User')
const AuditLog     = require('../models/AuditLog')
const Notification = require('../models/Notification')
const {
  requestRedemption, cancelRedemption, claimRedemption, rejectRedemption,
} = require('../controllers/redemptionController')

const KAB_ID = '64b000000000000000000001'
const REWARD_ID = '64b0000000000000000000a1'
const REQ_ID = '64b0000000000000000000f1'

const kab = (over = {}) => ({ _id: KAB_ID, role: 'kabataan', firstName: 'Ana', lastName: 'Cruz', isActive: true, idVerified: true, ...over })
const officer = { _id: '64b0000000000000000000c1', role: 'sk_secretary', firstName: 'Mia', lastName: 'Reyes' }
const reward = (over = {}) => ({ _id: REWARD_ID, title: 'Notebook set', pointsRequired: 50, stock: 3, isActive: true, ...over })

const makeReq = (user, extra = {}) => httpMocks.createRequest({ user, params: { id: REWARD_ID }, body: {}, headers: {}, ...extra })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
  Notification.create = jest.fn().mockResolvedValue({})
  Redemption.exists = jest.fn().mockResolvedValue(null)
  User.findByIdAndUpdate = jest.fn().mockResolvedValue({})
  Points.aggregate = jest.fn().mockResolvedValue([{ _id: 'earned', total: 80 }, { _id: 'redeemed', total: 10 }]) // balance 70
  Points.create = jest.fn().mockResolvedValue({ _id: 'pts1' })
  Redemption.create = jest.fn().mockImplementation(async (d) => ({ ...d, _id: REQ_ID, code: 'R-0000F1' }))
})

describe('requestRedemption', () => {
  test('unverified member is refused before anything is deducted', async () => {
    Reward.findById = jest.fn()
    const res = makeRes()
    await requestRedemption(makeReq(kab({ idVerified: false })), res)
    expect(res._status).toBe(403)
    expect(Reward.findById).not.toHaveBeenCalled()
  })

  test('deducts points only if the balance covers it, reserves one item, logs the redeemed points', async () => {
    Reward.findById = jest.fn().mockResolvedValue(reward())
    User.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: KAB_ID })
    Reward.findOneAndUpdate = jest.fn().mockResolvedValue({})
    const res = makeRes()
    await requestRedemption(makeReq(kab()), res)

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(KAB_ID, { points: 70 }) // synced from the ledger
    expect(User.findOneAndUpdate).toHaveBeenCalledWith({ _id: KAB_ID, points: { $gte: 50 } }, { $inc: { points: -50 } })
    expect(Reward.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: REWARD_ID, isActive: true, stock: { $gt: 0 } }, { $inc: { stock: -1 } })
    expect(Points.create).toHaveBeenCalledWith(expect.objectContaining({ pointsEarned: 50, type: 'redeemed' }))
    expect(Redemption.create).toHaveBeenCalledWith(expect.objectContaining({ points: 50, rewardTitle: 'Notebook set', pointsEntry: 'pts1' }))
    expect(res._status).toBe(201)
  })

  test('not enough points → 400 and nothing recorded', async () => {
    Reward.findById = jest.fn().mockResolvedValue(reward({ pointsRequired: 100 }))
    User.findOneAndUpdate = jest.fn().mockResolvedValue(null)
    Reward.findOneAndUpdate = jest.fn()
    const res = makeRes()
    await requestRedemption(makeReq(kab()), res)
    expect(res._status).toBe(400)
    expect(Reward.findOneAndUpdate).not.toHaveBeenCalled()
    expect(Points.create).not.toHaveBeenCalled()
  })

  test('last item taken by someone else → points given back, 400', async () => {
    Reward.findById = jest.fn().mockResolvedValue(reward({ stock: 1 }))
    User.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: KAB_ID })
    Reward.findOneAndUpdate = jest.fn().mockResolvedValue(null)
    const res = makeRes()
    await requestRedemption(makeReq(kab()), res)
    expect(User.findByIdAndUpdate).toHaveBeenLastCalledWith(KAB_ID, { $inc: { points: 50 } })
    expect(res._status).toBe(400)
    expect(Redemption.create).not.toHaveBeenCalled()
  })

  test('unlimited stock (−1) is not decremented', async () => {
    Reward.findById = jest.fn().mockResolvedValue(reward({ stock: -1 }))
    User.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: KAB_ID })
    Reward.findOneAndUpdate = jest.fn()
    const res = makeRes()
    await requestRedemption(makeReq(kab()), res)
    expect(Reward.findOneAndUpdate).not.toHaveBeenCalled()
    expect(res._status).toBe(201)
  })

  test('a second request for the same reward while one is waiting → 400', async () => {
    Reward.findById = jest.fn().mockResolvedValue(reward())
    Redemption.exists = jest.fn().mockResolvedValue({ _id: 'x' })
    User.findOneAndUpdate = jest.fn()
    const res = makeRes()
    await requestRedemption(makeReq(kab()), res)
    expect(res._status).toBe(400)
    expect(User.findOneAndUpdate).not.toHaveBeenCalled()
  })
})

describe('cancel / reject refund, claim records hand-over', () => {
  const pending = (over = {}) => ({ _id: REQ_ID, user: KAB_ID, reward: REWARD_ID, rewardTitle: 'Notebook set', points: 50, pointsEntry: 'pts1', code: 'R-0000F1', ...over })
  const populated = (doc) => ({ populate: jest.fn().mockResolvedValue(doc) })

  test('member cancels their own waiting request → points and stock returned', async () => {
    Redemption.findOneAndUpdate = jest.fn().mockResolvedValue(pending())
    Points.findByIdAndDelete = jest.fn().mockResolvedValue({})
    Reward.updateOne = jest.fn().mockResolvedValue({})
    const res = makeRes()
    await cancelRedemption(makeReq(kab(), { params: { id: REQ_ID } }), res)
    expect(Redemption.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: REQ_ID, user: KAB_ID, status: 'pending' }, expect.objectContaining({ status: 'cancelled' }), { new: true })
    expect(Points.findByIdAndDelete).toHaveBeenCalledWith('pts1')
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(KAB_ID, { $inc: { points: 50 } })
    expect(Reward.updateOne).toHaveBeenCalledWith({ _id: REWARD_ID, stock: { $gte: 0 } }, { $inc: { stock: 1 } })
  })

  test('reject needs a reason', async () => {
    Redemption.findOneAndUpdate = jest.fn()
    const res = makeRes()
    await rejectRedemption(makeReq(officer, { params: { id: REQ_ID }, body: { reason: '  ' } }), res)
    expect(res._status).toBe(400)
    expect(Redemption.findOneAndUpdate).not.toHaveBeenCalled()
  })

  test('reject refunds and tells the member why', async () => {
    Redemption.findOneAndUpdate = jest.fn().mockReturnValue(populated(pending({ user: { _id: KAB_ID, firstName: 'Ana', lastName: 'Cruz' } })))
    Points.findByIdAndDelete = jest.fn().mockResolvedValue({})
    Reward.updateOne = jest.fn().mockResolvedValue({})
    const res = makeRes()
    await rejectRedemption(makeReq(officer, { params: { id: REQ_ID }, body: { reason: 'Out of notebooks' } }), res)
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(KAB_ID, { $inc: { points: 50 } })
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ user: KAB_ID, type: 'REWARD_REJECTED', message: expect.stringContaining('Out of notebooks') }))
  })

  test('claim only works on a waiting request (already handled → 404, no refund)', async () => {
    Redemption.findOneAndUpdate = jest.fn().mockReturnValue(populated(null))
    Points.findByIdAndDelete = jest.fn()
    const res = makeRes()
    await claimRedemption(makeReq(officer, { params: { id: REQ_ID } }), res)
    expect(res._status).toBe(404)
    expect(Points.findByIdAndDelete).not.toHaveBeenCalled()
  })
})
