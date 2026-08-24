// models/Activity.js
// Under a Project. Has a cost and attendance/points tracking.
// This is where kabataan earn points (prorated by attendance)

const mongoose = require('mongoose')

const activitySchema = new mongoose.Schema({
  project:     { type:mongoose.Schema.Types.ObjectId, ref:'Project', required:true },
  program:     { type:mongoose.Schema.Types.ObjectId, ref:'Program', required:true },
  title:       { type:String, required:true, trim:true },
  description: { type:String, trim:true },
  type:        { type:String, enum:['Meeting','Workshop','Community Service','Training','Sports','Health','Livelihood','Other'], default:'Other' },
  status:      { type:String, enum:['planned','ongoing','completed','cancelled'], default:'planned' },

  // Schedule
  startDate:  { type:Date, required:true },
  endDate:    { type:Date, required:true },
  totalDays:  { type:Number, default:1 },  // computed from startDate to endDate
  venue:      { type:String },

  // Budget
  estimatedCost: { type:Number, default:0 },
  actualCost:    { type:Number, default:0 },

  // Points — defined per activity by SK
  pointsPerDay:  { type:Number, default:0 },  // points per day attended
  totalPoints:   { type:Number, default:0 },  // pointsPerDay * totalDays (full attendance)

  // Attendance tracking
  // Each entry: { user, daysAttended, pointsEarned }
  attendance: [{
    user:          { type:mongoose.Schema.Types.ObjectId, ref:'User' },
    daysAttended:  { type:Number, default:0 },
    pointsEarned:  { type:Number, default:0 },   // prorated: (daysAttended/totalDays) * totalPoints
    recordedAt:    { type:Date, default:Date.now },
    recordedBy:    { type:mongoose.Schema.Types.ObjectId, ref:'User' },
  }],


  // Progress/proof photos — SK uploads pictures of the actual PPA
  // so kabataan can see the project is real and track progress
  photos: [{
    url:        { type:String, required:true },  // Cloudinary URL
    caption:    { type:String, default:'' },
    uploadedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User' },
    uploadedAt: { type:Date, default:Date.now },
  }],
  createdBy: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  notes:     { type:String },
}, { timestamps:true })

// Auto-compute totalDays and totalPoints before save
activitySchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const diff = (this.endDate - this.startDate) / (1000 * 60 * 60 * 24)
    this.totalDays = Math.max(1, Math.round(diff) + 1)
  }
  this.totalPoints = this.pointsPerDay * this.totalDays
  next()
})

module.exports = mongoose.model('Activity', activitySchema)