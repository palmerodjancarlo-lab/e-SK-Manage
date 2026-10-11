// controllers/notificationController.js
// A member's own in-app notifications. Every query is scoped to req.user.
const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const serverError = require('../utils/serverError')

const LIST_LIMIT = 30

// @GET /api/notifications — latest notifications + unread count
const getMyNotifications = async (req, res) => {
  try {
    const [notifications, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean(),
      Notification.countDocuments({ user: req.user._id, readAt: null }),
    ])
    res.json({ notifications, unread })
  } catch (error) { serverError(res, error) }
}

// @PUT /api/notifications/:id/read
const markRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Notification not found.' })
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true },
    )
    if (!n) return res.status(404).json({ message: 'Notification not found.' })
    res.json({ notification: n })
  } catch (error) { serverError(res, error) }
}

// @PUT /api/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } })
    res.json({ message: 'All notifications marked as read.' })
  } catch (error) { serverError(res, error) }
}

module.exports = { getMyNotifications, markRead, markAllRead }
