const mongoose = require('mongoose')

const ProgramSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  objectives: {
    type: String,
    required: true
  },
  date: Date,
  venue: String,
  budget: {
    allocated: { type: Number, default: 0 },
    spent:     { type: Number, default: 0 }
  },
  budgetBreakdown: [{
    item:      String,
    allocated: Number,
    actual:    Number
  }],
  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Upcoming'
  },
  sdgGoal: String,
  photos: [String],
  attendance: { type: Number, default: 0 },
  accomplishments: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

module.exports = mongoose.model('Program', ProgramSchema)