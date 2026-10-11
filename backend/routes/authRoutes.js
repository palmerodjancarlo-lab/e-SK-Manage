const express    = require('express')
const router     = express.Router()
const ctrl       = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')
const { loginLimiter, codeLimiter, emailLimiter, registerLimiter } = require('../middleware/rateLimiters')

router.post('/register',        registerLimiter, ctrl.register)
router.post('/login',           loginLimiter,    ctrl.login)
router.post('/verify-email',    codeLimiter,     ctrl.verifyEmail)
router.post('/resend-code',     emailLimiter,    ctrl.resendCode)
router.post('/forgot-password', emailLimiter,    ctrl.forgotPassword)
router.post('/reset-password',  codeLimiter,     ctrl.resetPassword)
router.get('/profile',          protect, ctrl.getProfile)
router.put('/profile',          protect, ctrl.updateProfile)
router.put('/change-password',  protect, ctrl.changePassword)
router.delete('/account',       protect, ctrl.deleteAccount)
// Email change — the new address is only applied after its emailed code is confirmed
router.post('/change-email',         protect, emailLimiter, ctrl.requestEmailChange)
router.post('/change-email/confirm', protect, codeLimiter,  ctrl.confirmEmailChange)
router.delete('/change-email',       protect, ctrl.cancelEmailChange)
router.get('/id-document',           protect, ctrl.getMyIdDocument)   // own residency document (private)
router.get('/members',          protect, ctrl.getMembers)   // SK + admin can view roster

module.exports = router