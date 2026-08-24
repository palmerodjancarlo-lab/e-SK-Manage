// models/Expense.js
// Records money SPENT by SK
// Linked to an Activity/Project for budget rollup
// Cannot be deleted — only voided with reason + name logged

const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema({

  // What was bought / spent on
  title:       { type:String, required:[true,'Expense title is required'], trim:true },
  description: { type:String, trim:true, default:'' },

  category: {
    type: String,
    enum: [
      'supplies',       // office/activity supplies
      'food',           // meals/snacks for activity
      'transportation', // travel costs
      'equipment',      // tools/equipment purchased
      'venue',          // venue rental
      'printing',       // tarpaulins, documents
      'honorarium',     // speaker/facilitator fees
      'other',
    ],
    default: 'other',
  },

  amount: {
    type:     Number,
    required: [true,'Amount is required'],
    min:      [0.01, 'Amount must be greater than 0'],
  },

  // Receipt details — based on physical receipts
  receiptNumber: { type:String, trim:true, default:'' },
  receiptPhoto:  { type:String, default:'' }, // Cloudinary URL of receipt photo
  receiptDate:   { type:Date, default:Date.now },
  vendor:        { type:String, trim:true, default:'' }, // store/supplier name

  dateSpent: {
    type:     Date,
    required: [true,'Date spent is required'],
    default:  Date.now,
  },

  // Links to hierarchy
  activity: { type:mongoose.Schema.Types.ObjectId, ref:'Activity', default:null },
  project:  { type:mongoose.Schema.Types.ObjectId, ref:'Project',  default:null },
  program:  { type:mongoose.Schema.Types.ObjectId, ref:'Program',  default:null },

  // Approval workflow
  // Treasurer records → Chairperson approves
  status: {
    type:    String,
    enum:    ['pending','approved','rejected','voided'],
    default: 'pending',
  },

  // Who recorded (Treasurer or Chairperson)
  recordedBy: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  // Who approved (Chairperson)
  approvedBy: { type:mongoose.Schema.Types.ObjectId, ref:'User', default:null },
  approvedAt: { type:Date, default:null },

  // Rejection
  rejectedBy:     { type:mongoose.Schema.Types.ObjectId, ref:'User', default:null },
  rejectedAt:     { type:Date, default:null },
  rejectionReason:{ type:String, default:'' },

  // Voiding — instead of deletion
  isVoided:   { type:Boolean, default:false },
  voidReason: { type:String,  default:'' },
  voidedBy:   { type:mongoose.Schema.Types.ObjectId, ref:'User', default:null },
  voidedAt:   { type:Date, default:null },

  notes: { type:String, default:'' },

  // Full edit history — who changed what and when
  // Old values are always preserved
  editHistory: [{
    editedBy:  { type:mongoose.Schema.Types.ObjectId, ref:'User' },
    editedAt:  { type:Date, default:Date.now },
    oldValues: { type:mongoose.Schema.Types.Mixed },
    changes:   { type:String },
  }],

}, { timestamps:true })

module.exports = mongoose.model('Expense', expenseSchema)