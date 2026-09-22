const express    = require('express')
const router     = express.Router()
const ctrl       = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')

router.post('/register',        ctrl.register)
router.post('/login',           ctrl.login)
router.post('/verify-email',    ctrl.verifyEmail)
router.post('/resend-code',     ctrl.resendCode)
router.post('/forgot-password',  ctrl.forgotPassword)
router.post('/reset-password',   ctrl.resetPassword)
router.get('/profile',          protect, ctrl.getProfile)
router.put('/profile',          protect, ctrl.updateProfile)
router.put('/change-password',  protect, ctrl.changePassword)
router.delete('/account',       protect, ctrl.deleteAccount)
router.get('/members',          protect, ctrl.getMembers)   // SK + admin can view roster

module.exports = router