// ============================================================
// File:    scanReceipt.int.test.js
// Test:    POST /upload/scan-receipt end to end — real multipart upload, real
//          Tesseract OCR, real parser. Only Cloudinary is replaced, so tests
//          never touch the real cloud account. Fixtures are rendered receipt
//          images (a clean receipt, a tilted/blurred phone photo, a GCash
//          transfer). First run downloads the OCR model, hence the timeouts.
// ============================================================

require('./setup')
const fs = require('fs')
const path = require('path')
const express = require('express')
const multer = require('multer')

const FIXTURES = path.join(__dirname, 'fixtures')
const ENHANCED_URL = 'https://cdn.test/enhanced.png'
let currentImage = null // what the fake Cloudinary "enhanced" URL serves

jest.mock('../config/cloudinary', () => ({
  config: jest.fn(),
  uploader: {
    upload: jest.fn(async (dataUri) => ({
      public_id: 'esk-manage/receipts/receipt_test',
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/esk-manage/receipts/receipt_test.png',
      version: 1,
      type: 'upload',
      format: dataUri.startsWith('data:application/pdf') ? 'pdf' : 'png',
    })),
    destroy: jest.fn(),
  },
  url: jest.fn(() => 'https://cdn.test/enhanced.png'),
  utils: {},
}))

const { uploadLarge, scanReceipt } = require('../controllers/uploadController')

let server, url
const realFetch = global.fetch

beforeAll(() => {
  global.fetch = (u, opts) => (String(u) === ENHANCED_URL
    ? Promise.resolve(new Response(currentImage, { status: 200 }))
    : realFetch(u, opts))
  const app = express()
  app.post('/scan', uploadLarge.single('file'), scanReceipt)
  app.use((err, req, res, next) => res.status(err instanceof multer.MulterError ? 400 : (err.status || 500)).json({ message: err.message }))
  server = app.listen(0)
  url = `http://127.0.0.1:${server.address().port}/scan`
})
afterAll(async () => {
  global.fetch = realFetch
  server.close()
  await require('../utils/ocr').terminateWorkers()
})

const scan = (fileName, { field = 'file', type = 'image/png', extra = {} } = {}) => {
  const bytes = fs.readFileSync(path.join(FIXTURES, fileName))
  currentImage = bytes
  const fd = new FormData()
  for (const [k, v] of Object.entries(extra)) fd.append(k, v)
  fd.append(field, new Blob([bytes], { type }), fileName)
  return realFetch(url, { method: 'POST', body: fd })
}

jest.setTimeout(120000)

test('reads a store receipt: store, OR no., date, items and total', async () => {
  const res = await scan('hardware-receipt.png')
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.url).toMatch(/receipt_test/)
  expect(body.ocr).toMatchObject({
    vendor: 'MARINDUQUE HARDWARE & SUPPLY',
    referenceNumber: '0045871',
    date: '2026-10-08',
    total: 1025,
    itemsMatchTotal: true,
  })
  expect(body.ocr.items).toHaveLength(3)
})

test('recovers a tilted, blurred phone photo with the second OCR pass', async () => {
  const body = await (await scan('tilted-photo-receipt.png')).json()
  expect(body.ocr.total).toBe(316)
  expect(body.ocr.itemsMatchTotal).toBe(true)
  expect(body.ocr.engine).toMatch(/block/)
})

test('reads a GCash transfer as a fund document', async () => {
  const body = await (await scan('gcash-transfer.png')).json()
  expect(body.ocr).toMatchObject({
    total: 5000,
    payer: 'BARANGAY TAWIRAN TREASURY',
    referenceNumber: '1012345678901',
    kind: 'transfer',
    sourceType: 'barangay_allocation',
  })
})

test('digital PDFs use their own text layer instead of OCR', async () => {
  const body = await (await scan('hardware-receipt.png', {
    type: 'application/pdf',
    extra: { pdfText: 'SM HYPERMARKET\nSI No. 778812\nDate: 09/12/2026\nBOND PAPER 2 x 245.00\nTOTAL 490.00' },
  })).json()
  expect(body.isPdf).toBe(true)
  expect(body.ocr.engine).toBe('pdf-text')
  expect(body.ocr.total).toBe(490)
})

test('the old field name is rejected clearly instead of failing silently', async () => {
  const res = await scan('hardware-receipt.png', { field: 'receipt' })
  expect(res.status).toBe(400)
})

test('non-document files are refused', async () => {
  currentImage = Buffer.from('x')
  const fd = new FormData()
  fd.append('file', new Blob(['<html></html>'], { type: 'text/html' }), 'page.html')
  const res = await realFetch(url, { method: 'POST', body: fd })
  expect(res.status).toBe(400)
})
