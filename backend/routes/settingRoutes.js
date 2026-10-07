// routes/settingRoutes.js
const express     = require('express')
const router      = express.Router()
const ctrl        = require('../controllers/settingController')
const { protect } = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

// Public — the landing page reads the Contact block (no login).
router.get('/public', ctrl.getPublicSettings)

// Head only — chairperson/admin edits the Contact block from the console.
router.put('/', protect, authorize('admin', 'sk_chairperson'), ctrl.updateSettings)

// Head only — live system health + counts for the Settings monitor panel.
router.get('/system', protect, authorize('admin', 'sk_chairperson'), ctrl.getSystemInfo)

module.exports = router