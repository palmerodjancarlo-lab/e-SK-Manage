// controllers/uploadController.js
// Handles file uploads to Cloudinary
// Used for receipt photos and document uploads

const cloudinary = require('cloudinary').v2
const multer     = require('multer')

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Store files in memory before uploading to Cloudinary
const storage = multer.memoryStorage()
const upload  = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
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
    const b64    = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`

    const result = await cloudinary.uploader.upload(dataURI, {
      folder:    'esk-manage/receipts',
      public_id: `receipt_${Date.now()}`,
    })

    res.json({
      message: 'Receipt uploaded successfully.',
      url:      result.secure_url,
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

    const b64     = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`

    const result = await cloudinary.uploader.upload(dataURI, {
      folder:        'esk-manage/documents',
      public_id:     `doc_${Date.now()}`,
      resource_type: 'auto',
    })

    res.json({
      message: 'Document uploaded successfully.',
      url:      result.secure_url,
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

    const b64     = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`

    const result = await cloudinary.uploader.upload(dataURI, {
      folder:         'esk-manage/photos',
      public_id:      `photo_${req.user._id}`,
      transformation: [{ width:400, height:400, crop:'fill', gravity:'face' }],
      overwrite:      true,
    })

    res.json({
      message: 'Photo uploaded successfully.',
      url:      result.secure_url,
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

    // Upload to Cloudinary first
    const b64     = Buffer.from(req.file.buffer).toString('base64')
    const dataURI = `data:${req.file.mimetype};base64,${b64}`
    const result  = await cloudinary.uploader.upload(dataURI, {
      folder: 'esk-manage/receipts', public_id: `receipt_${Date.now()}`,
    })

    // Attempt OCR (best-effort — won't fail the request if it errors)
    let ocr = { amount: null, date: null, rawText: '' }
    try {
      const Tesseract = require('tesseract.js')
      const { data } = await Tesseract.recognize(req.file.buffer, 'eng')
      const text = data.text || ''
      ocr.rawText = text

      // Find the largest peso-like amount (handles ₱, P, PHP, commas, decimals)
      const amountMatches = text.match(/(?:₱|P|PHP)?\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/gi) || []
      const nums = amountMatches
        .map(m => parseFloat(m.replace(/[^0-9.]/g,'')))
        .filter(n => !isNaN(n) && n > 0)
      if (nums.length) ocr.amount = Math.max(...nums)

      // Find a date (common PH formats)
      const dateMatch = text.match(/([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/)
        || text.match(/([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4})/)
      if (dateMatch) ocr.date = dateMatch[1]
    } catch (ocrErr) {
      // OCR failed — that's fine, treasurer enters manually
      ocr.error = 'Could not auto-read the receipt. Please enter details manually.'
    }

    res.json({
      message: 'Receipt uploaded.',
      url: result.secure_url,
      ocr,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { upload, uploadReceipt, scanReceipt, uploadDocument, uploadPhoto }