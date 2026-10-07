// models/Expense.js
const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema({
  title:       { type:String, required:[true,'Expense title is required'], trim:true },
  description: { type:String, trim:true, default:'' },

  category: {
    type: String,
    enum: ['supplies','food','transportation','equipment','venue','printing','honorarium','other'],
    default: 'other',
  },

  amount: {
    type:     Number,
    required: [true,'Amount is required'],
    min:      [0.01, 'Amount must be greater than 0'],
  },

  // Itemized breakdown (from a scanned/uploaded receipt or manual entry)
  items: [{
    description: { type:String, trim:true, default:'' },
    quantity:    { type:Number, default:1 },
    amount:      { type:Number, required:true, min:0 },
    category:    { type:String, default:'other' },
  }],

  // Receipt / document details
  receiptNumber: { type:String, trim:true, default:'' },
  receiptPhoto:  { type:String, default:'' }, // Cloudinary URL of the receipt/document
  receiptDate:   { type:Date, default:Date.now },
  vendor:        { type:String, trim:true, default:'' },

  dateSpent: {
    type:     Date,
    required: [true,'Date spent is required'],
    default:  Date.now,
  },

  activity: { type:mongoose.Schema.Types.ObjectId, ref:'Activity', default:null },
  project:  { type:mongoose.Schema.Types.ObjectId, ref:'Project',  default:null },
  program:  { type:mongoose.Schema.Types.ObjectId, ref:'Program',  default:null },

  status: {
    type:    String,
    enum:    ['pending','approved','rejected','voided'],
    default: 'pending',
  },

  recordedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User', required: true },
  approvedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User', default:null },
  approvedAt: { type:Date, default:null },
  rejectedBy:      { type:mongoose.Schema.Types.ObjectId, ref:'User', default:null },
  rejectedAt:      { type:Date, default:null },
  rejectionReason: { type:String, default:'' },

  isVoided:   { type:Boolean, default:false },
  voidReason: { type:String,  default:'' },
  voidedBy:   { type:mongoose.Schema.Types.ObjectId, ref:'User', default:null },
  voidedAt:   { type:Date, default:null },

  // How this expense was created — for the transparency trail
  source: { type:String, enum:['manual','scanned'], default:'manual' },

  notes: { type:String, default:'' },

  editHistory: [{
    editedBy:  { type:mongoose.Schema.Types.ObjectId, ref:'User' },
    editedAt:  { type:Date, default:Date.now },
    oldValues: { type:mongoose.Schema.Types.Mixed },
    changes:   { type:String },
  }],
}, { timestamps:true })

module.exports = mongoose.model('Expense', expenseSchema)