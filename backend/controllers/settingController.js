// controllers/settingController.js
const mongoose = require('mongoose')
const Setting = require('../models/Setting')
const User    = require('../models/User')
const Program = require('../models/Program')
const Meeting = require('../models/Meeting')
let Announcement = null
try { Announcement = require('../models/Announcement') } catch { /* optional */ }

const OFFICERS = ['sk_chairperson', 'sk_secretary', 'sk_treasurer', 'sk_kagawad', 'admin']

// Always return the single settings row, creating it with defaults if missing.
async function getOrCreate() {
  let doc = await Setting.findOne({ key: 'site' })
  if (!doc) doc = await Setting.create({ key: 'site' })
  return doc
}

// @GET /api/v1/settings/public  (no auth — used by the landing page)
const getPublicSettings = async (req, res) => {
  try {
    const s = await getOrCreate()
    res.json({
      settings: {
        address:  s.address,
        email:    s.email,
        phone:    s.phone,
        facebook: s.facebook,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/v1/settings  (head only)
const updateSettings = async (req, res) => {
  try {
    const { address, email, phone, facebook } = req.body
    const s = await getOrCreate()
    if (address  !== undefined) s.address  = address
    if (email    !== undefined) s.email    = email
    if (phone    !== undefined) s.phone    = phone
    if (facebook !== undefined) s.facebook = facebook
    s.updatedBy = req.user?._id || null
    await s.save()
    res.json({ message: 'Settings updated', settings: s })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/v1/settings/system  (head only)
// Real system health + live counts for the Settings monitor panel.
const getSystemInfo = async (req, res) => {
  try {
    const now = new Date()
    const dbConnected = mongoose.connection.readyState === 1

    const [totalUsers, kabataan, pendingVerification, officials, programs, upcomingMeetings, announcements] =
      await Promise.all([
        User.countDocuments().catch(() => 0),
        User.countDocuments({ role: 'kabataan' }).catch(() => 0),
        User.countDocuments({ role: 'kabataan', idVerified: false }).catch(() => 0),
        User.countDocuments({ role: { $in: OFFICERS } }).catch(() => 0),
        Program.countDocuments().catch(() => 0),
        Meeting.countDocuments({ date: { $gte: now } }).catch(() => 0),
        Announcement ? Announcement.countDocuments().catch(() => 0) : Promise.resolve(0),
      ])

    let version = '1.0.0'
    try { version = require('../package.json').version || version } catch { /* ignore */ }

    res.json({
      status: 'ok',
      db: dbConnected ? 'connected' : 'disconnected',
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version,
      lastChecked: now,
      counts: { totalUsers, kabataan, pendingVerification, officials, programs, upcomingMeetings, announcements },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getPublicSettings, updateSettings, getSystemInfo }