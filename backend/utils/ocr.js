// utils/ocr.js — text recognition for receipts and money documents
//
// Two Tesseract workers are created lazily and reused (loading the English
// model takes seconds; doing it per request would make every scan slow):
//   • "column" mode reads tidy receipts line by line,
//   • "block" mode recovers tilted / low-contrast phone photos where column
//     mode stops early.
// Column mode runs first; block mode only runs when the first result looks
// incomplete, and the more complete parse wins.
//
// Images are pre-processed by Cloudinary before OCR — downscaled, grayscale,
// auto-improved and sharpened — which also converts formats Tesseract cannot
// read itself (iPhone HEIC photos, the first page of scanned PDFs).

const { createWorker, PSM } = require('tesseract.js')
const cloudinary = require('../config/cloudinary')
const { parseDocument, scoreParse } = require('./receiptParser')

const workers = {}

const getWorker = (mode) => {
  if (!workers[mode]) {
    workers[mode] = (async () => {
      const worker = await createWorker('eng')
      await worker.setParameters({
        tessedit_pageseg_mode: mode === 'block' ? PSM.SINGLE_BLOCK : PSM.SINGLE_COLUMN,
        preserve_interword_spaces: '1', // keeps "ITEM      120.00" columns apart
      })
      return worker
    })()
    workers[mode].catch(() => { delete workers[mode] }) // retry on the next request
  }
  return workers[mode]
}

const recognize = async (buffer, mode = 'column') => {
  const worker = await getWorker(mode)
  const { data } = await worker.recognize(buffer)
  return { text: data.text || '', confidence: Math.round(data.confidence || 0), mode }
}

// A result is "good enough" when the total was found on a real total line and
// any items read add up to it.
const isComplete = (parsed) => parsed.confidence.total === 'high' && (!parsed.items.length || parsed.itemsMatchTotal)

/** OCR + parse, with a second pass in block mode when the first is incomplete. */
const readDocument = async (buffer) => {
  const first = await recognize(buffer, 'column')
  const firstParsed = parseDocument(first.text)
  if (isComplete(firstParsed)) return { ...first, parsed: firstParsed }

  const second = await recognize(buffer, 'block')
  const secondParsed = parseDocument(second.text)
  return scoreParse(secondParsed) > scoreParse(firstParsed)
    ? { ...second, parsed: secondParsed }
    : { ...first, parsed: firstParsed }
}

// OCR-friendly rendition of an uploaded Cloudinary image/PDF
const ocrImageUrl = (upload) => cloudinary.url(upload.public_id, {
  secure: true,
  resource_type: 'image',
  type: upload.type || 'upload',
  version: upload.version,
  format: 'png',
  ...(upload.format === 'pdf' ? { page: 1 } : {}),
  transformation: [
    { width: 2200, height: 2200, crop: 'limit' },
    { effect: 'grayscale' },
    { effect: 'improve' },
    { effect: 'sharpen:60' },
  ],
})

// Small JPG used to preview PDFs/HEIC in the browser
const previewImageUrl = (upload) => cloudinary.url(upload.public_id, {
  secure: true,
  resource_type: 'image',
  version: upload.version,
  format: 'jpg',
  ...(upload.format === 'pdf' ? { page: 1 } : {}),
  transformation: [{ width: 1200, crop: 'limit' }],
})

const fetchBuffer = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

const DIRECT_OCR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/**
 * Read an uploaded document. Uses the cleaned-up Cloudinary rendition first and
 * falls back to the original bytes when the file is a format Tesseract reads.
 * @returns {{ text, confidence, mode, parsed, source }}
 */
const ocrUploadedDocument = async (upload, file) => {
  try {
    const cleaned = await fetchBuffer(ocrImageUrl(upload))
    return { ...(await readDocument(cleaned)), source: 'enhanced' }
  } catch (err) {
    if (!DIRECT_OCR_TYPES.includes(file.mimetype)) throw err
    return { ...(await readDocument(file.buffer)), source: 'original' }
  }
}

// Stop the OCR workers (tests / graceful shutdown)
const terminateWorkers = async () => {
  const all = Object.values(workers)
  for (const key of Object.keys(workers)) delete workers[key]
  await Promise.all(all.map((p) => p.then((w) => w.terminate()).catch(() => {})))
}

module.exports = { recognize, readDocument, ocrUploadedDocument, ocrImageUrl, previewImageUrl, terminateWorkers }
