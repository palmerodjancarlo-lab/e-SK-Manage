const Announcement = require('../models/Announcement')
const AuditLog     = require('../models/AuditLog')

// @GET /api/announcements — Get all
const getAnnouncements = async (req, res) => {
  try {
    const { category, search } = req.query
    let query = { isArchived: false }

    if (category) query.category = category
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
    res.status(500).json({ message: error.message })
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
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/announcements — Create
const createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create({
      ...req.body,
      author: req.user._id
    })

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_ANNOUNCEMENT',
      details: `Created announcement: ${announcement.title}`
    })

    res.status(201).json({ message: 'Announcement created', announcement })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/announcements/:id — Update
const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement
      .findByIdAndUpdate(req.params.id, req.body, { new: true })

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' })
    }

    res.json({ message: 'Announcement updated', announcement })
  } catch (error) {
    res.status(500).json({ message: error.message })
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
    })

    res.json({ message: 'Announcement deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/announcements/:id/pin — Toggle pin
const togglePin = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    announcement.isPinned = !announcement.isPinned
    await announcement.save()
    res.json({ message: `Announcement ${announcement.isPinned ? 'pinned' : 'unpinned'}`, announcement })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getAnnouncements, getAnnouncement,
  createAnnouncement, updateAnnouncement,
  deleteAnnouncement, togglePin
}