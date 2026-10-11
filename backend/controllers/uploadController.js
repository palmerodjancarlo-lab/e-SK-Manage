// controllers/uploadController.js
// Handles file uploads to Cloudinary
// Used for receipt photos and document uploads

const serverError = require('../utils/serverError')
const multer = require('multer')
const cloudinary = require('../config/cloudinary')
const User = require('../models/User')
const AuditLog = require('../models/AuditLog')
const { isHeic, uploadIdFile, destroyIdAsset, destroyLegacy } = require('../utils/idDocuments')
const { ocrUploadedDocument, previewImageUrl } = require('../utils/ocr')
const { parseDocument } = require('../utils/receiptParser')

// Store files in memory before uploading to Cloudinary
const storage = multer.memoryStorage()
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype) || isHeic(file)) cb(null, true)
  else cb(Object.assign(new Error('Only photos (JPG, PNG, WebP, HEIC) and PDF files are allowed.'), { status: 400 }))
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }) // 5MB max

// IDs and receipts are often full-resolution phone photos, so they get more room.
const uploadIdDoc = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB max
const uploadLarge = uploadIdDoc

// POST /api/upload/receipt
// Upload a receipt photo
// Receipts are public finance-transparency records (not personal data like IDs)
const uploadReceiptFile = (file) => {
  const mime = isHeic(file) ? 'image/heic' : file.mimetype
  return cloudinary.uploader.upload(`data:${mime};base64,${Buffer.from(file.buffer).toString('base64')}`, {
    folder: 'esk-manage/receipts',
    public_id: `receipt_${Date.now()}`,
    ...(isHeic(file) ? { format: 'jpg' } : {}), // so every browser can display it
  })
}

const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })
    const result = await uploadReceiptFile(req.file)

    res.json({
      message: 'Receipt uploaded successfully.',
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    serverError(res, error)
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
    serverError(res, error)
  }
}

// POST /api/upload/ppa-photo
// Progress/proof photos for programs, projects and activities (shown to kabataan).
// Phone photos are big, so Cloudinary scales them down to 1600px and picks the format.
const uploadPpaPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })
    if (!/^image\//.test(req.file.mimetype) && !isHeic(req.file)) {
      return res.status(400).json({ message: 'Only photos (JPG, PNG, WebP, HEIC) can be added here.' })
    }
    const dataURI = `data:${req.file.mimetype};base64,${Buffer.from(req.file.buffer).toString('base64')}`
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'esk-manage/ppa',
      resource_type: 'image',
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
    })
    res.json({ message: 'Photo uploaded.', url: result.secure_url })
  } catch (error) {
    serverError(res, error)
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
    serverError(res, error)
  }
}


// POST /api/upload/scan-receipt
// Store a receipt / money document AND read it. Works for expense receipts and
// fund documents (deposit slips, checks, GCash/Maya transfers, ORs).
// Digital PDFs send their own text layer (`pdfText`, extracted in the browser);
// photos and scanned PDFs go through OCR. The result only PRE-FILLS a form —
// a person always confirms or corrects it before anything is recorded.
const scanReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })

    const upload = await uploadReceiptFile(req.file)
    const isPdf = upload.format === 'pdf'
    const response = {
      message: 'Document uploaded.',
      url: upload.secure_url,
      previewUrl: isPdf || isHeic(req.file) ? previewImageUrl(upload) : upload.secure_url,
      isPdf,
    }

    const pdfText = typeof req.body.pdfText === 'string' ? req.body.pdfText.slice(0, 20000) : ''
    try {
      if (pdfText.replace(/\s/g, '').length >= 30) {
        response.ocr = { ...parseDocument(pdfText), engine: 'pdf-text', ocrConfidence: null }
      } else {
        const ocr = await ocrUploadedDocument(upload, req.file)
        response.ocr = { ...ocr.parsed, engine: `ocr-${ocr.source}-${ocr.mode}`, ocrConfidence: ocr.confidence }
      }
      if (!response.ocr.rawText.trim()) response.ocr.error = 'No readable text was found. Try a sharper, well-lit photo, or type the details below.'
      response.message = 'Document read.'
    } catch (ocrErr) {
      console.error('Receipt OCR failed:', ocrErr.message)
      response.ocr = { error: 'The document was saved but could not be read automatically. Please type the details below.' }
    }

    res.json(response)
  } catch (error) {
    serverError(res, error)
  }
}

// POST /api/upload/id  — a member submits ANY valid ID or proof of residency.
// The file is stored privately and recorded on the user here (server-side), so
// a client can never point its profile at an arbitrary URL.
const uploadId = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })
    const idType = typeof req.body.idType === 'string' ? req.body.idType.trim().slice(0, 80) : ''
    if (!idType) return res.status(400).json({ message: 'Tell us what kind of ID or document this is.' })

    const user = await User.findById(req.user._id).select('+idDocument')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    if (user.idVerified) return res.status(400).json({ message: 'Your residency is already verified.' })

    const result = await uploadIdFile(req.file, user._id)
    const previous  = user.idDocument
    const legacyUrl = user.idPhoto

    user.idDocument    = { publicId: result.public_id, resourceType: result.resource_type, format: result.format }
    user.idType        = idType
    user.idSubmittedAt = new Date()
    user.idPhoto       = ''
    await user.save()

    // Remove the files this one replaces (best effort — never blocks the response)
    if (previous?.publicId) destroyIdAsset(previous)
    if (legacyUrl) destroyLegacy(legacyUrl)

    AuditLog.create({
      user: user._id, action: 'UPLOAD_ID',
      details: `${user.firstName} ${user.lastName} submitted a residency document (${idType})`,
    }).catch(() => {})

    const fresh = await User.findById(user._id).select('-password')
    res.json({ message: 'ID submitted. The SK Chairperson will review it.', user: fresh })
  } catch (error) { serverError(res, error) }
}

module.exports = { upload, uploadIdDoc, uploadLarge, uploadReceipt, scanReceipt, uploadDocument, uploadPhoto, uploadPpaPhoto, uploadId }