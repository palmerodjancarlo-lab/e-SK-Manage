// controllers/uploadController.js
// Handles file uploads to Cloudinary
// Used for receipt photos and document uploads

const cloudinary = require('cloudinary').v2
const multer = require('multer')

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Store files in memory before uploading to Cloudinary
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only images (JPEG, PNG, WebP) and PDF files are allowed.'))
  }
})

// POST /api/upload/receipt
// Upload a receipt photo
const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })

    // Convert buffer to base64 for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'esk-manage/receipts',
      public_id: `receipt_${Date.now()}`,
    })

    res.json({
      message: 'Receipt uploaded successfully.',
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/upload/document
// Upload a document (PDF, image)
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })

    const b64 = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'esk-manage/documents',
      public_id: `doc_${Date.now()}`,
      resource_type: 'auto',
    })

    res.json({
      message: 'Document uploaded successfully.',
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/upload/photo
// Upload profile photo
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })

    const b64 = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'esk-manage/photos',
      public_id: `photo_${req.user._id}`,
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      overwrite: true,
    })

    res.json({
      message: 'Photo uploaded successfully.',
      url: result.secure_url,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


// POST /api/upload/scan-receipt
// Upload receipt AND attempt to read amount/date via OCR (best-effort)
// Frontend can pre-fill the form; treasurer confirms/corrects
const scanReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })

    // Store the document in Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'esk-manage/receipts', public_id: `receipt_${Date.now()}`,
    })

    const ocr = { vendor: '', date: null, total: null, items: [], rawText: '' }
    try {
      const Tesseract = require('tesseract.js')
      const { data } = await Tesseract.recognize(req.file.buffer, 'eng')
      const text = data.text || ''
      ocr.rawText = text

      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

      // Vendor: first meaningful text line (letters, no price)
      ocr.vendor = (lines.find((l) => /[A-Za-z]{3,}/.test(l) && !/\d{1,3}(,\d{3})*\.\d{2}/.test(l)) || '').slice(0, 60)

      // Date
      const dateMatch = text.match(/([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/)
        || text.match(/([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4})/)
      if (dateMatch) ocr.date = dateMatch[1]

      // Line items: "Description ..... 123.45"  (skip totals/tax/change lines)
      const SKIP = /(total|subtotal|sub total|change|cash|amount|tendered|vat|tax|balance|tender|received|payment|due)/i
      for (const line of lines) {
        if (SKIP.test(line)) continue
        const m = line.match(/^(.*?[A-Za-z].*?)\s+(?:₱|P|PHP)?\s*([0-9][0-9,]*\.[0-9]{2})$/)
        if (m) {
          const desc = m[1].trim().replace(/\s{2,}/g, ' ')
          const amt = parseFloat(m[2].replace(/,/g, ''))
          if (desc.length >= 2 && amt > 0) ocr.items.push({ description: desc, amount: amt })
        }
      }

      // Total: prefer an explicit TOTAL line, else the largest amount seen
      const totalLine = lines.find((l) => /total/i.test(l) && /[0-9]/.test(l))
      if (totalLine) {
        const tm = totalLine.match(/([0-9][0-9,]*\.[0-9]{2})/)
        if (tm) ocr.total = parseFloat(tm[1].replace(/,/g, ''))
      }
      if (!ocr.total) {
        const all = (text.match(/([0-9][0-9,]*\.[0-9]{2})/g) || []).map((x) => parseFloat(x.replace(/,/g, '')))
        if (all.length) ocr.total = Math.max(...all)
      }
    } catch (ocrErr) {
      ocr.error = 'Could not auto-read the document. Please enter the breakdown manually.'
    }

    res.json({ message: 'Document uploaded and scanned.', url: result.secure_url, ocr })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


// POST /api/upload/id  — a kabataan uploads a valid ID / residency proof
const uploadId = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })
    const b64 = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'esk-manage/ids', public_id: `id_${req.user._id}`, overwrite: true,
    })
    res.json({ message: 'ID uploaded.', url: result.secure_url })
  } catch (error) { res.status(500).json({ message: error.message }) }
}

module.exports = { upload, uploadReceipt, scanReceipt, uploadDocument, uploadPhoto, uploadId }