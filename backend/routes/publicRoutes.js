// routes/publicRoutes.js — public, no authentication (landing page data)
const express = require('express')
const router  = express.Router()
const { getPublicOverview } = require('../controllers/publicController')

router.get('/overview', getPublicOverview)

module.exports = router