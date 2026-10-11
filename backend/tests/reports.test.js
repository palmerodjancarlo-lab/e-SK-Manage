// ============================================================
// File:    reports.test.js
// Test:    Saved reports — edits change content only, edits/deletes are audited
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/Report')
jest.mock('../models/AuditLog')

const Report   = require('../models/Report')
const AuditLog = require('../models/AuditLog')
const { updateReport, deleteReport } = require('../controllers/reportController')

const makeReq = (body = {}, extra = {}) => httpMocks.createRequest({ body, user: chair, ...extra })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}
const chair = { _id: 'c1', firstName: 'Maria', lastName: 'Santos', role: 'sk_chairperson' }

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
})

describe('updateReport', () => {
  const doc = () => ({ _id: 'r1', title: 'ABYIP FY 2026', type: 'abyip', status: 'draft', generatedBy: 'treasurer1', save: jest.fn().mockResolvedValue() })

  test('updates the same report (no new copy) and keeps who generated it', async () => {
    const report = doc()
    Report.findById = jest.fn().mockResolvedValue(report)
    Report.create = jest.fn()
    const res = makeRes()
    await updateReport(makeReq({ title: 'ABYIP FY 2026', data: { a: 1 }, status: 'finalized', generatedBy: 'attacker', type: 'custom' }, { params: { id: 'r1' } }), res)
    expect(Report.create).not.toHaveBeenCalled()
    expect(report.save).toHaveBeenCalled()
    expect(report.data).toEqual({ a: 1 })
    expect(report.status).toBe('finalized')
    expect(report.generatedBy).toBe('treasurer1')
    expect(report.type).toBe('abyip')
  })

  test('status change is written to the audit trail', async () => {
    Report.findById = jest.fn().mockResolvedValue(doc())
    await updateReport(makeReq({ status: 'finalized' }, { params: { id: 'r1' } }), makeRes())
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE_REPORT', details: expect.stringContaining('draft → finalized') }))
  })

  test('unknown report → 404', async () => {
    Report.findById = jest.fn().mockResolvedValue(null)
    const res = makeRes()
    await updateReport(makeReq({ title: 'x' }, { params: { id: 'nope' } }), res)
    expect(res._status).toBe(404)
  })
})

describe('deleteReport', () => {
  test('deletes and records it in the audit trail', async () => {
    Report.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'r1', title: 'CBYDP 2026-2028', type: 'cbydp', status: 'finalized' })
    const res = makeRes()
    await deleteReport(makeReq({}, { params: { id: 'r1' } }), res)
    expect(res._json.message).toBe('Report deleted.')
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE_REPORT', details: expect.stringContaining('CBYDP 2026-2028') }))
  })

  test('unknown report → 404, nothing logged', async () => {
    Report.findByIdAndDelete = jest.fn().mockResolvedValue(null)
    const res = makeRes()
    await deleteReport(makeReq({}, { params: { id: 'nope' } }), res)
    expect(res._status).toBe(404)
    expect(AuditLog.create).not.toHaveBeenCalled()
  })
})
