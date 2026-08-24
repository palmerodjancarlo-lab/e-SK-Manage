// routes/uploadRoutes.js
const express  = require('express')
const router   = express.Router()
const { protect } = require('../middleware/authMiddleware')
const authorize   = require('../middleware/authorize')
const { upload, uploadReceipt, scanReceipt, uploadDocument, uploadPhoto } = require('../controllers/uploadController')

const SK_ALL = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

router.post('/receipt',      protect, authorize(...SK_ALL), upload.single('file'), uploadReceipt)
router.post('/scan-receipt', protect, authorize(...SK_ALL), upload.single('file'), scanReceipt)
router.post('/document', protect, authorize(...SK_ALL), upload.single('file'), uploadDocument)
router.post('/photo',    protect, upload.single('file'), uploadPhoto) // any authenticated user

module.exports = router