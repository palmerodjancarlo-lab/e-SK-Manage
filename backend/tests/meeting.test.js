// ============================================================
// File:    meeting.test.js
// Author:  Mhervin Mabuti
// Group:   CapsG4 — Web Systems and Technologies 2
// Project: e-SK Manage — SK Youth Management System
// Test:    Meeting Controller — create, QR activate/deactivate, check-in
// ============================================================

const httpMocks = require('node-mocks-http')

jest.mock('../models/Meeting')
jest.mock('../models/User')
jest.mock('../models/Points')
jest.mock('../models/AuditLog')
jest.mock('../models/Announcement')

const Meeting      = require('../models/Meeting')
const User         = require('../models/User')
const Points       = require('../models/Points')
const AuditLog     = require('../models/AuditLog')
const Announcement = require('../models/Announcement')

const {
  getMeetings, getMeeting, createMeeting,
  generateQR, deactivateQR, checkIn,
} = require('../controllers/meetingController')

const makeReq = (body = {}, user = null, params = {}) =>
  httpMocks.createRequest({ body, params, user })

const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json   = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}

const fakeSK = () => ({
  _id:'skid001', role:'sk_officer', firstName:'SK', lastName:'Officer',
})

const fakeKab = (id = 'kabid001') => ({
  _id:id, role:'kabataan_user', firstName:'Kab', lastName:'User',
})

const fakeMeeting = (overrides = {}) => ({
  _id:         'mtgid001',
  title:       'Test Meeting',
  type:        'Meeting',
  date:        new Date(Date.now() + 86400000),
  pointsReward:10,
  qrToken:     'secrettoken123',
  qrActive:    false,
  checkedIn:   [],
  rsvp:        [],
  comments:    [],
  save:        jest.fn().mockResolvedValue(true),
  toObject:    jest.fn(function() { return { ...this } }),
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create     = jest.fn().mockResolvedValue({})
  Announcement.create = jest.fn().mockResolvedValue({})
})

// ── GET MEETINGS ──────────────────────────────────────────────────────────────

describe('getMeetings', () => {

  test('returns qrToken to SK officer', async () => {
    const meeting = fakeMeeting()
    Meeting.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockResolvedValue([meeting]),
    })

    const req = makeReq({}, fakeSK())
    const res = makeRes()

    await getMeetings(req, res)

    expect(res._json.meetings[0].qrToken).toBeDefined()
  })

  test('hides qrToken from kabataan user', async () => {
    const meeting = fakeMeeting()
    meeting.toObject = jest.fn().mockReturnValue({
      _id:'mtgid001', title:'Test', qrToken:'secrettoken123', qrActive:false,
    })

    Meeting.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockResolvedValue([meeting]),
    })

    const req = makeReq({}, fakeKab())
    const res = makeRes()

    await getMeetings(req, res)

    expect(res._json.meetings[0].qrToken).toBeUndefined()
  })

  test('still returns qrActive to kabataan user', async () => {
    const meeting = fakeMeeting({ qrActive:true })
    meeting.toObject = jest.fn().mockReturnValue({
      _id:'mtgid001', title:'Test', qrToken:'secrettoken123', qrActive:true,
    })

    Meeting.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockResolvedValue([meeting]),
    })

    const req = makeReq({}, fakeKab())
    const res = makeRes()

    await getMeetings(req, res)

    expect(res._json.meetings[0].qrActive).toBe(true)
  })
})

// ── CREATE MEETING ────────────────────────────────────────────────────────────

describe('createMeeting', () => {

  test('creates meeting with auto-generated qrToken', async () => {
    const created = fakeMeeting({ qrToken:'autotoken', qrActive:false })
    Meeting.create = jest.fn().mockResolvedValue(created)

    const req = makeReq({
      title:'Monthly SK', type:'Meeting',
      date: new Date(), venue:'Boac Hall', municipality:'Boac',
    }, fakeSK())
    const res = makeRes()

    await createMeeting(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res._json.meeting.qrToken).toBeDefined()
    expect(res._json.meeting.qrActive).toBe(false)
  })

  test('sets correct points per meeting type', async () => {
    const types = [
      { type:'Meeting',    pts:10 },
      { type:'Workshop',   pts:15 },
      { type:'Event',      pts:20 },
      { type:'Seminar',    pts:15 },
      { type:'Livelihood', pts:20 },
      { type:'Sports',     pts:15 },
    ]

    for (const { type, pts } of types) {
      Meeting.create = jest.fn().mockResolvedValue(fakeMeeting({ type, pointsReward:pts }))

      const req = makeReq({ title:'T', type, date:new Date(), venue:'V', municipality:'Boac' }, fakeSK())
      const res = makeRes()

      await createMeeting(req, res)

      expect(res._json.meeting.pointsReward).toBe(pts)
    }
  })

  test('returns 500 if Meeting.create throws (e.g., missing required field)', async () => {
    // Real controller has no explicit field check — mongoose throws on missing required fields
    // Meeting.create is mocked to throw a validation error
    Meeting.create = jest.fn().mockRejectedValue(new Error('title is required'))

    const req = makeReq({ type:'Meeting' }, fakeSK()) // missing title
    const res = makeRes()

    await createMeeting(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ── GENERATE QR ───────────────────────────────────────────────────────────────

describe('generateQR', () => {

  test('activates QR and returns token', async () => {
    const meeting = fakeMeeting({ qrActive:false, qrToken:'existingtoken' })
    Meeting.findById = jest.fn().mockResolvedValue(meeting)

    const req = makeReq({}, fakeSK(), { id:'mtgid001' })
    const res = makeRes()

    await generateQR(req, res)

    expect(meeting.qrActive).toBe(true)
    expect(meeting.save).toHaveBeenCalled()
    expect(res._json.qrToken).toBeDefined()
  })

  test('returns 404 if meeting not found', async () => {
    Meeting.findById = jest.fn().mockResolvedValue(null)

    const req = makeReq({}, fakeSK(), { id:'nonexistent' })
    const res = makeRes()

    await generateQR(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ── DEACTIVATE QR ─────────────────────────────────────────────────────────────

describe('deactivateQR', () => {

  test('sets qrActive to false', async () => {
    Meeting.findByIdAndUpdate = jest.fn().mockResolvedValue(
      fakeMeeting({ qrActive:false })
    )

    const req = makeReq({}, fakeSK(), { id:'mtgid001' })
    const res = makeRes()

    await deactivateQR(req, res)

    expect(Meeting.findByIdAndUpdate).toHaveBeenCalledWith(
      'mtgid001',
      { qrActive:false },
      { new:true }
    )
    expect(res._json.message).toMatch(/deactivated/i)
  })
})

// ── CHECK IN ──────────────────────────────────────────────────────────────────

describe('checkIn', () => {

  test('returns 400 if qrToken not provided', async () => {
    const req = makeReq({}, fakeKab())
    const res = makeRes()

    await checkIn(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  test('returns 404 if token not found', async () => {
    Meeting.findOne = jest.fn().mockResolvedValue(null)

    const req = makeReq({ qrToken:'badtoken' }, fakeKab())
    const res = makeRes()

    await checkIn(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  test('returns 400 if QR is not active', async () => {
    Meeting.findOne = jest.fn().mockResolvedValue(
      fakeMeeting({ qrActive:false })
    )

    const req = makeReq({ qrToken:'secrettoken123' }, fakeKab())
    const res = makeRes()

    await checkIn(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.message).toMatch(/not active/i)
  })

  test('returns alreadyCheckedIn if user already checked in', async () => {
    const kab = fakeKab()
    const meeting = fakeMeeting({
      qrActive:  true,
      checkedIn: [{ user: kab._id }],
    })
    Meeting.findOne = jest.fn().mockResolvedValue(meeting)

    const req = makeReq({ qrToken:'secrettoken123' }, kab)
    const res = makeRes()

    await checkIn(req, res)

    expect(res._json.alreadyCheckedIn).toBe(true)
  })

  test('awards points on successful check-in', async () => {
    const kab = fakeKab()
    const meeting = fakeMeeting({ qrActive:true, pointsReward:10, checkedIn:[] })
    Meeting.findOne = jest.fn().mockResolvedValue(meeting)
    Points.create   = jest.fn().mockResolvedValue({ _id:'pts001' })
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})

    const req = makeReq({ qrToken:'secrettoken123' }, kab)
    const res = makeRes()

    await checkIn(req, res)

    expect(Points.create).toHaveBeenCalled()
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      kab._id,
      { $inc: { points: 10 } }
    )
    expect(res._json.pointsAwarded).toBe(10)
    expect(res._json.message).toMatch(/successful/i)
  })
})