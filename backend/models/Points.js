// models/Points.js
// Source of truth for all points transactions
// Points can come from: meeting QR check-in OR activity attendance

const mongoose = require('mongoose')

const pointsSchema = new mongoose.Schema({
  user:         { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  meeting:      { type:mongoose.Schema.Types.ObjectId, ref:'Meeting' },   // if from QR check-in
  activity:     { type:mongoose.Schema.Types.ObjectId, ref:'Activity' },  // if from activity attendance
  pointsEarned: { type:Number, required:true, min:1 },
  type:         { type:String, enum:['earned','awarded','redeemed'], default:'earned' },
  reason:       { type:String },
  checkedInAt:  { type:Date, default:Date.now },
}, { timestamps:true })

module.exports = mongoose.model('Points', pointsSchema)