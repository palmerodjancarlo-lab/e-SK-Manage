// models/Reward.js
// SK-defined rewards. Kabataan reach a points threshold to become eligible.

const mongoose = require('mongoose')

const rewardSchema = new mongoose.Schema({
  title:        { type:String, required:[true,'Reward title is required'], trim:true },
  description:  { type:String, trim:true, default:'' },
  pointsRequired:{ type:Number, required:[true,'Points required is needed'], min:1 },
  image:        { type:String, default:'' },   // optional Cloudinary URL
  stock:        { type:Number, default:-1 },    // -1 = unlimited
  isActive:     { type:Boolean, default:true },
  createdBy:    { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
}, { timestamps:true })

module.exports = mongoose.model('Reward', rewardSchema)