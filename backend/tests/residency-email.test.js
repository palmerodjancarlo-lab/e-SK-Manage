// ============================================================
// File:    residency-email.test.js
// Test:    Private residency documents (any ID type) and verified email change
// ============================================================

require('./setup')
const httpMocks = require('node-mocks-http')

jest.mock('../models/User')
jest.mock('../models/AuditLog')
jest.mock('../utils/sendEmail')
jest.mock('../config/cloudinary', () => ({
  config: jest.fn(),
  uploader: { upload: jest.fn(), destroy: jest.fn(), rename: jest.fn() },
  utils: { private_download_url: jest.fn(() => 'https://api.cloudinary.com/v1_1/demo/image/download?signed') },
}))

const User       = require('../models/User')
const AuditLog   = require('../models/AuditLog')
const mail       = require('../utils/sendEmail')
const cloudinary = require('../config/cloudinary')

const { updateProfile, requestEmailChange, confirmEmailChange } = require('../controllers/authController')
const { uploadId, uploadIdDoc } = require('../controllers/uploadController')
const { streamIdDocument, parseLegacyUrl } = require('../utils/idDocuments')

const makeReq = (body = {}, user = null, extra = {}) => httpMocks.createRequest({ body, user, ...extra })
const makeRes = () => {
  const res  = httpMocks.createResponse()
  res.json   = jest.fn((data) => { res._json = data; return res })
  res.status = jest.fn((code) => { res._status = code; return res })
  return res
}
const query = (value) => {
  const q = Promise.resolve(value)
  q.select = jest.fn(() => q)
  return q
}
const me = { _id: 'u1', email: 'old@example.com', firstName: 'Ana', lastName: 'Cruz', role: 'kabataan' }

beforeEach(() => {
  jest.clearAllMocks()
  AuditLog.create = jest.fn().mockResolvedValue({})
  mail.sendEmailChangeCode.mockResolvedValue({})
  mail.sendEmailChangedNotice.mockResolvedValue({})
  cloudinary.uploader.destroy.mockResolvedValue({})
})

// ── updateProfile no longer changes email or ID directly ─────────────────────

describe('updateProfile', () => {
  test('refuses a direct email change', async () => {
    User.findByIdAndUpdate = jest.fn()
    const res = makeRes()
    await updateProfile(makeReq({ email: 'new@example.com' }, me), res)
    expect(res._status).toBe(400)
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  test('saves other fields and ignores a client-supplied ID URL', async () => {
    User.findByIdAndUpdate = jest.fn(() => query({ ...me, firstName: 'Anna' }))
    const res = makeRes()
    await updateProfile(makeReq({ email: 'OLD@example.com', firstName: 'Anna', idPhoto: 'https://evil.example/x.jpg' }, me), res)
    const updates = User.findByIdAndUpdate.mock.calls[0][1]
    expect(updates.firstName).toBe('Anna')
    expect(updates).not.toHaveProperty('idPhoto')
    expect(updates).not.toHaveProperty('email')
  })
})

// ── Email change ──────────────────────────────────────────────────────────────

describe('requestEmailChange', () => {
  const account = (overrides = {}) => ({ ...me, matchPassword: jest.fn().mockResolvedValue(true), save: jest.fn().mockResolvedValue(true), ...overrides })

  test('requires the current password', async () => {
    User.findById = jest.fn(() => query(account({ matchPassword: jest.fn().mockResolvedValue(false) })))
    const res = makeRes()
    await requestEmailChange(makeReq({ newEmail: 'new@example.com', password: 'wrong' }, me), res)
    expect(res._status).toBe(400)
    expect(mail.sendEmailChangeCode).not.toHaveBeenCalled()
  })

  test('rejects an address another account uses', async () => {
    User.findById = jest.fn(() => query(account()))
    User.exists = jest.fn().mockResolvedValue({ _id: 'other' })
    const res = makeRes()
    await requestEmailChange(makeReq({ newEmail: 'taken@example.com', password: 'pw' }, me), res)
    expect(res._status).toBe(409)
  })

  test('stores the pending address and emails a code to it — email itself unchanged', async () => {
    const user = account()
    User.findById = jest.fn(() => query(user))
    User.exists = jest.fn().mockResolvedValue(null)
    const res = makeRes()
    await requestEmailChange(makeReq({ newEmail: ' New@Example.com ', password: 'pw' }, me), res)

    expect(user.email).toBe('old@example.com')
    expect(user.pendingEmail).toBe('new@example.com')
    expect(user.emailChangeCode).toMatch(/^\d{6}$/)
    expect(mail.sendEmailChangeCode).toHaveBeenCalledWith('new@example.com', 'Ana', user.emailChangeCode)
    expect(res._json.pendingEmail).toBe('new@example.com')
  })
})

describe('confirmEmailChange', () => {
  const pending = (overrides = {}) => ({
    ...me, pendingEmail: 'new@example.com', emailChangeCode: '246810',
    emailChangeExpires: new Date(Date.now() + 60_000), save: jest.fn().mockResolvedValue(true), ...overrides,
  })

  test('a wrong code does not change the email', async () => {
    const user = pending()
    User.findById = jest.fn(() => query(user))
    User.findByIdAndUpdate = jest.fn(() => query({ emailChangeAttempts: 1 }))
    const res = makeRes()
    await confirmEmailChange(makeReq({ code: '000000' }, me), res)
    expect(res._status).toBe(400)
    expect(res._json.message).toBe('Incorrect code. 4 attempts left.')
    expect(user.email).toBe('old@example.com')
  })

  test('too many wrong codes discards the pending code', async () => {
    User.findById = jest.fn(() => query(pending()))
    User.findByIdAndUpdate = jest.fn()
      .mockReturnValueOnce(query({ emailChangeAttempts: 6 }))
      .mockReturnValueOnce(query({}))
    const res = makeRes()
    await confirmEmailChange(makeReq({ code: '246810' }, me), res)
    expect(res._status).toBe(429)
  })

  test('the right code swaps the email and notifies the old address', async () => {
    const user = pending()
    User.findById = jest.fn()
      .mockReturnValueOnce(query(user))
      .mockReturnValueOnce(query({ ...me, email: 'new@example.com' }))
    User.findByIdAndUpdate = jest.fn(() => query({ emailChangeAttempts: 1 }))
    User.exists = jest.fn().mockResolvedValue(null)
    const res = makeRes()
    await confirmEmailChange(makeReq({ code: '246810' }, me), res)

    expect(user.email).toBe('new@example.com')
    expect(user.pendingEmail).toBe('')
    expect(user.save).toHaveBeenCalled()
    expect(mail.sendEmailChangedNotice).toHaveBeenCalledWith('old@example.com', 'Ana', 'new@example.com')
    expect(res._json.user.email).toBe('new@example.com')
  })
})

// ── Residency document upload ────────────────────────────────────────────────

describe('uploadId', () => {
  const file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg', originalname: 'id.jpg' }

  test('requires the type of document', async () => {
    const res = makeRes()
    await uploadId(makeReq({}, me, { file }), res)
    expect(res._status).toBe(400)
  })

  test('accepts any document type and stores it privately', async () => {
    const user = { ...me, idVerified: false, idPhoto: 'https://res.cloudinary.com/demo/image/upload/v1/esk-manage/ids/id_u1.jpg', save: jest.fn().mockResolvedValue(true) }
    User.findById = jest.fn()
      .mockReturnValueOnce(query(user))
      .mockReturnValueOnce(query({ ...me, idType: 'Certificate of Residency' }))
    cloudinary.uploader.upload.mockResolvedValue({ public_id: 'esk-manage/ids/id_u1_1', resource_type: 'image', format: 'jpg' })
    const req = makeReq({ idType: 'Certificate of Residency' }, me, { file })
    req.file = file
    const res = makeRes()
    await uploadId(req, res)

    expect(cloudinary.uploader.upload.mock.calls[0][1].type).toBe('authenticated')
    expect(user.idDocument).toEqual({ publicId: 'esk-manage/ids/id_u1_1', resourceType: 'image', format: 'jpg' })
    expect(user.idType).toBe('Certificate of Residency')
    expect(user.idPhoto).toBe('')                       // legacy public link removed from the record
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('esk-manage/ids/id_u1', { type: 'upload', invalidate: true })
  })

  test('verified residents cannot replace their document', async () => {
    User.findById = jest.fn(() => query({ ...me, idVerified: true }))
    const req = makeReq({ idType: 'School ID' }, me)
    req.file = file
    const res = makeRes()
    await uploadId(req, res)
    expect(res._status).toBe(400)
    expect(cloudinary.uploader.upload).not.toHaveBeenCalled()
  })

  test('iPhone HEIC photos are converted to JPG on upload', async () => {
    const user = { ...me, idVerified: false, save: jest.fn().mockResolvedValue(true) }
    User.findById = jest.fn().mockReturnValueOnce(query(user)).mockReturnValueOnce(query(me))
    cloudinary.uploader.upload.mockResolvedValue({ public_id: 'p', resource_type: 'image', format: 'jpg' })
    const heic = { buffer: Buffer.from('x'), mimetype: 'application/octet-stream', originalname: 'IMG_0001.HEIC' }
    const req = makeReq({ idType: 'School ID' }, me)
    req.file = heic
    await uploadId(req, makeRes())
    expect(cloudinary.uploader.upload.mock.calls[0][1].format).toBe('jpg')
    expect(cloudinary.uploader.upload.mock.calls[0][0]).toMatch(/^data:image\/heic;base64,/)
  })
})

describe('upload file filter (real multipart requests)', () => {
  const express = require('express')
  const multer  = require('multer')
  let server, url
  beforeAll(() => {
    const app = express()
    app.post('/id', uploadIdDoc.single('file'), (req, res) => res.json({ ok: true }))
    app.use((err, req, res, next) => res.status(err instanceof multer.MulterError ? 400 : (err.status || 500)).json({ message: err.message }))
    server = app.listen(0)
    url = `http://127.0.0.1:${server.address().port}/id`
  })
  afterAll(() => server.close())

  const post = (type, name, size = 10) => {
    const fd = new FormData()
    fd.append('file', new Blob([Buffer.alloc(size)], { type }), name)
    return fetch(url, { method: 'POST', body: fd })
  }

  test.each([
    ['image/jpeg', 'id.jpg'],
    ['application/pdf', 'barangay-cert.pdf'],
    ['image/heic', 'IMG_0001.heic'],
    ['application/octet-stream', 'IMG_0002.HEIC'],
  ])('accepts %s (%s)', async (type, name) => {
    expect((await post(type, name)).status).toBe(200)
  })

  test('rejects other file types', async () => {
    expect((await post('text/html', 'page.html')).status).toBe(400)
  })

  test('accepts phone photos larger than 5 MB, up to 10 MB', async () => {
    expect((await post('image/jpeg', 'big.jpg', 7 * 1024 * 1024)).status).toBe(200)
    expect((await post('image/jpeg', 'huge.jpg', 11 * 1024 * 1024)).status).toBe(400)
  })
})

// ── Serving the private document ─────────────────────────────────────────────

describe('streamIdDocument', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch })

  const streamRes = () => {
    const res = makeRes()
    res.set = jest.fn()
    return res
  }

  test('404 when nothing has been submitted', async () => {
    const res = streamRes()
    await streamIdDocument(res, { idPhoto: '' })
    expect(res._status).toBe(404)
  })

  test('fetches through a short-lived signed URL and never exposes it', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, body: new Blob(['pdf']).stream() })
    const res = streamRes()
    res.write = jest.fn(); res.end = jest.fn(); res.on = jest.fn(); res.once = jest.fn(); res.emit = jest.fn()
    await streamIdDocument(res, { idDocument: { publicId: 'esk-manage/ids/id_u1_1', resourceType: 'image', format: 'pdf' } })

    const opts = cloudinary.utils.private_download_url.mock.calls[0][2]
    expect(opts.type).toBe('authenticated')
    expect(opts.expires_at - Date.now() / 1000).toBeLessThanOrEqual(60)
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store',
    }))
    expect(res.json).not.toHaveBeenCalled()
  })

  test('502 when the file cannot be fetched', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false })
    const res = streamRes()
    await streamIdDocument(res, { idDocument: { publicId: 'p', format: 'jpg' } })
    expect(res._status).toBe(502)
  })
})

describe('parseLegacyUrl', () => {
  test('parses our legacy ID URLs', () => {
    expect(parseLegacyUrl('https://res.cloudinary.com/demo/image/upload/v1712/esk-manage/ids/id_abc.png'))
      .toEqual({ publicId: 'esk-manage/ids/id_abc', format: 'png' })
  })
  test('ignores anything outside the ids folder', () => {
    expect(parseLegacyUrl('https://res.cloudinary.com/demo/image/upload/v1/esk-manage/receipts/r.jpg')).toBeNull()
    expect(parseLegacyUrl('https://evil.example/esk-manage/ids/id_abc.png')).toBeNull()
  })
})
