// models/Program.js
// Umbrella — highest level. Contains multiple Projects.
// Budget = sum of all its Projects' budgets (rolled up automatically)

const mongoose = require('mongoose')

const programSchema = new mongoose.Schema({
  title:        { type:String, required:true, trim:true },
  description:  { type:String, trim:true },
  category:     { type:String, enum:['Youth Development','Health','Livelihood','Education','Environment','Sports','Peace and Order','Other'], default:'Other' },
  status:       { type:String, enum:['planned','ongoing','completed','cancelled'], default:'planned' },
  startDate:    { type:Date },
  endDate:      { type:Date },
  municipality: { type:String },
  barangay:     { type:String },
  organizer:    { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },

  // Fund sources — multiple sources allowed (barangay allocation, sponsors, donations)
  fundSources: [{
    source:      { type:String, required:true },  // e.g. "Barangay Allocation", "Sponsor: SM", "Donation: DSWD"
    amount:      { type:Number, required:true, min:0 },
    description: { type:String },
    receivedAt:  { type:Date, default:Date.now },
  }],

  // Total budget is computed from fundSources
  totalBudget: { type:Number, default:0 },

  // Computed from projects (virtual or updated on save)
  totalProjectCost: { type:Number, default:0 },


  // Progress/proof photos — SK uploads pictures of the actual PPA
  // so kabataan can see the project is real and track progress
  photos: [{
    url:        { type:String, required:true },  // Cloudinary URL
    caption:    { type:String, default:'' },
    uploadedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User' },
    uploadedAt: { type:Date, default:Date.now },
  }],
  notes: { type:String },
}, { timestamps:true })

// Virtual: remaining budget
programSchema.virtual('remainingBudget').get(function() {
  return this.totalBudget - this.totalProjectCost
})

module.exports = mongoose.model('Program', programSchema)