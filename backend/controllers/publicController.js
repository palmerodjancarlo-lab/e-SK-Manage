// controllers/publicController.js
// Public (no-login) data for the landing page. Read-only. NEVER exposes any
// financial figures — only what the barangay youth may see openly.
const Meeting = require('../models/Meeting')
const Program = require('../models/Program')
let Announcement = null
try { Announcement = require('../models/Announcement') } catch (e) { Announcement = null }

const settle = (p) => p.then((r) => r).catch(() => [])

// GET /api/v1/public/overview
const getPublicOverview = async (req, res) => {
  try {
    const now = new Date()
    const [rawAnns, rawEvents, rawProjects] = await Promise.all([
      Announcement
        ? settle(Announcement.find().sort({ isPinned: -1, createdAt: -1 }).limit(4).lean())
        : Promise.resolve([]),
      settle(Meeting.find({ date: { $gte: now } }).sort({ date: 1 }).limit(4)
        .select('title type date venue time').lean()),
      settle(Program.find({ status: { $in: ['ongoing', 'completed'] } })
        .sort({ updatedAt: -1 }).limit(6)
        .select('title category status startDate endDate photos').lean()),
    ])

    res.json({
      announcements: (rawAnns || []).map((a) => ({
        _id: a._id,
        title: a.title || 'Announcement',
        body: a.content || a.body || a.message || a.description || '',
        category: a.category || 'General',
        createdAt: a.createdAt,
      })),
      events: (rawEvents || []).map((m) => ({
        _id: m._id, title: m.title, type: m.type || 'Event',
        date: m.date, time: m.time || '', venue: m.venue || '',
      })),
      projects: (rawProjects || []).map((p) => ({
        _id: p._id, title: p.title, category: p.category || 'Program',
        status: p.status, startDate: p.startDate, endDate: p.endDate,
        photo: (p.photos && p.photos[0] && p.photos[0].url) || '',
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getPublicOverview }