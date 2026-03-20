const mongoose = require('mongoose')

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  category: {
    type: String,
    enum: ['Meetings', 'Events', 'Opportunities', 'Programs', 'General'],
    default: 'General'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  attachments: [String],
  municipality: {
    type: String,
    default: 'All'
  }
}, { timestamps: true })

module.exports = mongoose.model('Announcement', AnnouncementSchema);