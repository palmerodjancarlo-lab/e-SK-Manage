const Announcement = require('../models/Announcement')
const serverError = require('../utils/serverError')
const AuditLog     = require('../models/AuditLog')

// @GET /api/announcements — Get all
const getAnnouncements = async (req, res) => {
  try {
    const { category, search } = req.query
    const query = {}

    if (category && category !== 'All') query.category = category
    if (search) {
      query.$or = [
        { title:   { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ]
    }

    const announcements = await Announcement
      .find(query)
      .populate('author', 'firstName lastName role')
      .sort({ isPinned: -1, createdAt: -1 })

    res.json({ announcements })
  } catch (error) {
    serverError(res, error)
  }
}

// @GET /api/announcements/:id — Get one
const getAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement
      .findById(req.params.id)
      .populate('author', 'firstName lastName role')

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' })
    }
    res.json({ announcement })
  } catch (error) {
    serverError(res, error)
  }
}

const pick = require('../utils/pick')
const ANN_EDITABLE = ['title', 'content', 'category', 'isPinned']

// @POST /api/announcements — Create
const createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create({
      ...pick(req.body, ANN_EDITABLE),
      author: req.user._id,
    })

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_ANNOUNCEMENT',
      details: `Created announcement: ${announcement.title}`
    }).catch(() => {})

    res.status(201).json({ message: 'Announcement created', announcement })
  } catch (error) {
    serverError(res, error)
  }
}

// @PUT /api/announcements/:id — Update
const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement
      .findByIdAndUpdate(req.params.id, pick(req.body, ANN_EDITABLE), { new: true, runValidators: true })

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' })
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'UPDATE_ANNOUNCEMENT',
      details: `Updated announcement: ${announcement.title}`
    }).catch(() => {})

    res.json({ message: 'Announcement updated', announcement })
  } catch (error) {
    serverError(res, error)
  }
}

// @DELETE /api/announcements/:id — Delete
const deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id)

    await AuditLog.create({
      user: req.user._id,
      action: 'DELETE_ANNOUNCEMENT',
      details: `Deleted announcement ID: ${req.params.id}`
    }).catch(() => {})

    res.json({ message: 'Announcement deleted' })
  } catch (error) {
    serverError(res, error)
  }
}

// @PUT /api/announcements/:id/pin — Toggle pin
const togglePin = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' })
    announcement.isPinned = !announcement.isPinned
    await announcement.save()
    res.json({ message: `Announcement ${announcement.isPinned ? 'pinned' : 'unpinned'}`, announcement })
  } catch (error) {
    serverError(res, error)
  }
}

module.exports = {
  getAnnouncements, getAnnouncement,
  createAnnouncement, updateAnnouncement,
  deleteAnnouncement, togglePin
}