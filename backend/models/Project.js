// models/Project.js
// Under a Program. Contains multiple Activities.
// Cost = sum of all its Activities' costs (rolled up automatically)

const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema({
  program:      { type:mongoose.Schema.Types.ObjectId, ref:'Program', required:true },
  title:        { type:String, required:true, trim:true },
  description:  { type:String, trim:true },
  status:       { type:String, enum:['planned','ongoing','completed','cancelled'], default:'planned' },
  startDate:    { type:Date },
  endDate:      { type:Date },
  adjustedEndDate: { type:Date },   // if timeline was extended
  coordinator:  { type:mongoose.Schema.Types.ObjectId, ref:'User' },
  createdBy:    { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },

  // Budget allocated to this project from the program
  allocatedBudget: { type:Number, default:0 },

  // Computed from activities
  totalActivityCost: { type:Number, default:0 },


  // Progress/proof photos — SK uploads pictures of the actual PPA
  // so kabataan can see the project is real and track progress
  photos: [{
    url:        { type:String, required:true },  // Cloudinary URL
    caption:    { type:String, default:'' },
    uploadedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User' },
    uploadedAt: { type:Date, default:Date.now },
  }],
  completionReport: { type:String },  // narrative report when completed
  notes:            { type:String },
}, { timestamps:true })

projectSchema.virtual('remainingBudget').get(function() {
  return this.allocatedBudget - this.totalActivityCost
})

module.exports = mongoose.model('Project', projectSchema)