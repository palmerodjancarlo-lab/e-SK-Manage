const mongoose = require('mongoose')

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type:     String,
      required: [true, 'Announcement title is required'],
      trim:     true,
    },
    content: {
      type:     String,
      required: [true, 'Announcement content is required'],
      trim:     true,
    },
    category: {
      type:    String,
      enum:    ['General', 'Events', 'Programs', 'Opportunities', 'Reminder', 'History'],
      default: 'General',
    },
    isPinned: {
      type:    Boolean,
      default: false,
    },
    // Links an auto-generated announcement back to the Meeting/Program it came from,
    // so deleting that source also removes this announcement (cascade).
    sourceType: {
      type:    String,
      enum:    ['manual', 'meeting', 'program'],
      default: 'manual',
    },
    sourceId: {
      type:    mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Structured details for auto-posted announcements, rendered as a clean
    // labeled layout instead of a text blob. Shape depends on meta.kind:
    //   meeting  → { kind, eventType, date, time, venue, agenda, points, volunteerRole }
    //   program  → { kind, status, startDate }
    meta: {
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },
    author: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
  },
  { timestamps: true }   // adds createdAt / updatedAt
)

module.exports = mongoose.model('Announcement', AnnouncementSchema)