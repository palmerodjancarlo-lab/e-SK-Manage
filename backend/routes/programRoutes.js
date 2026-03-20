const express     = require('express')
const router      = express.Router()
const progCtrl    = require('../controllers/programController')
const { protect }   = require('../middleware/authMiddleware')
const { authorize } = require('../middleware/roleMiddleware')

router.get('/',       protect, progCtrl.getPrograms)
router.get('/:id',    protect, progCtrl.getProgram)
router.post('/',      protect, authorize('admin','sk_officer'), progCtrl.createProgram)
router.put('/:id',    protect, authorize('admin','sk_officer'), progCtrl.updateProgram)
router.delete('/:id', protect, authorize('admin','sk_officer'), progCtrl.deleteProgram)

module.exports = router