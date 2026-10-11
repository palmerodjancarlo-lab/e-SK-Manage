// routes/uploadRoutes.js
const express  = require('express')
const router   = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const { upload, uploadIdDoc, uploadLarge, uploadReceipt, scanReceipt, uploadDocument, uploadPhoto, uploadPpaPhoto, uploadId } = require('../controllers/uploadController')

const SK_ALL = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

router.post('/receipt',      protect, authorize(...SK_ALL), uploadLarge.single('file'), uploadReceipt)
router.post('/scan-receipt', protect, authorize(...SK_ALL), uploadLarge.single('file'), scanReceipt)
router.post('/document', protect, authorize(...SK_ALL), upload.single('file'), uploadDocument)
router.post('/ppa-photo', protect, authorize(...SK_ALL), uploadLarge.single('file'), uploadPpaPhoto) // PPA progress photos
router.post('/photo',    protect, upload.single('file'), uploadPhoto) // any authenticated user
router.post('/id',       protect, uploadIdDoc.single('file'), uploadId) // any valid ID / residency proof — stored privately

module.exports = router