// models/Fund.js
// Records money RECEIVED by SK
// Every fund receipt is permanent — no deletion, only voiding

const mongoose = require('mongoose')

const fundSchema = new mongoose.Schema({

  // Where the money came from
  source: {
    type: String,
    required: [true, 'Fund source is required'],
    trim: true,
    // e.g. "Barangay Allocation", "Donation - SM Foundation", "Grant - DSWD"
  },
  sourceType: {
    type: String,
    enum: ['barangay_allocation','donation','grant','other'],
    default: 'barangay_allocation',
  },

  amount: {
    type:     Number,
    required: [true, 'Amount is required'],
    min:      [1, 'Amount must be greater than 0'],
  },

  // Reference number (check number, OR number, etc.)
  referenceNumber: { type:String, trim:true, default:'' },

  // Optional: photo of the check/document proving the fund was received
  receiptPhoto: { type:String, default:'' }, // Cloudinary URL

  dateReceived: {
    type:     Date,
    required: [true, 'Date received is required'],
    default:  Date.now,
  },

  // Which program this fund is for (optional — can be general)
  program: { type:mongoose.Schema.Types.ObjectId, ref:'Program', default:null },

  purpose:  { type:String, trim:true, default:'' },
  notes:    { type:String, trim:true, default:'' },

  // Status — funds can be voided if recorded by mistake
  // but NEVER deleted — voiding creates an audit record
  isVoided:    { type:Boolean, default:false },
  voidReason:  { type:String, default:'' },
  voidedBy:    { type:mongoose.Schema.Types.ObjectId, ref:'User', default:null },
  voidedAt:    { type:Date, default:null },

  // Who recorded this
  recordedBy: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  // Edit history — every change is logged, nothing is lost
  editHistory: [{
    editedBy:  { type:mongoose.Schema.Types.ObjectId, ref:'User' },
    editedAt:  { type:Date, default:Date.now },
    oldValues: { type:mongoose.Schema.Types.Mixed }, // snapshot before edit
    changes:   { type:String }, // description of what changed
  }],

}, { timestamps:true })

module.exports = mongoose.model('Fund', fundSchema)