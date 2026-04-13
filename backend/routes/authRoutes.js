const express    = require('express')
const router     = express.Router()
const ctrl       = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')

router.post('/register',        ctrl.register)
router.post('/login',           ctrl.login)
router.get('/profile',          protect, ctrl.getProfile)
router.put('/profile',          protect, ctrl.updateProfile)
router.put('/change-password',  protect, ctrl.changePassword)
router.delete('/account',       protect, ctrl.deleteAccount)

module.exports = router