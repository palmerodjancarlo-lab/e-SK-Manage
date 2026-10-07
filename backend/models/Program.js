// models/Program.js
// Umbrella — highest level. Contains multiple Projects.
// Budget = sum of all its Projects' budgets (rolled up automatically)
// Also carries the planning metadata used to generate the CBYDP / ABYIP forms.

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
    source:      { type:String, required:true },
    amount:      { type:Number, required:true, min:0 },
    description: { type:String },
    receivedAt:  { type:Date, default:Date.now },
  }],

  totalBudget:      { type:Number, default:0 },
  totalProjectCost: { type:Number, default:0 },

  // ── ABYIP / CBYDP planning fields ──────────────────────────────────────────
  fiscalYear:           { type:Number },           // ABYIP year this PPA belongs to
  area:                 { type:String, default:'' },// ABYIP grouping, e.g. "General Administrative Program"
  referenceCode:        { type:String, default:'' },// e.g. "1000-001-001"
  centerOfParticipation:{ type:String, default:'' },// CBYDP grouping (Education, Environment, …)
  objective:            { type:String, default:'' },// CBYDP
  performanceIndicator: { type:String, default:'' },// CBYDP & ABYIP
  expectedResults:      { type:String, default:'' },// ABYIP
  dateOfImplementation: { type:String, default:'' },// ABYIP text range, e.g. "January - December 2026"
  personResponsible:    { type:String, default:'' },// e.g. "SK Treasurer", "SK C.O. Education"

  // CBYDP 3-year targets
  targets: {
    fy1: { type:String, default:'' },
    fy2: { type:String, default:'' },
    fy3: { type:String, default:'' },
  },

  // ABYIP budget classification (MOOE / Personnel Services / Capital Outlay)
  budget: {
    mooe:              { type:Number, default:0 },
    personnelServices: { type:Number, default:0 },
    capitalOutlay:     { type:Number, default:0 },
  },
  // ───────────────────────────────────────────────────────────────────────────

  photos: [{
    url:        { type:String, required:true },
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

// Virtual: ABYIP line total (MOOE + PS + CO), falls back to totalBudget
programSchema.virtual('abyipTotal').get(function() {
  const b = this.budget || {}
  const sum = (b.mooe || 0) + (b.personnelServices || 0) + (b.capitalOutlay || 0)
  return sum || this.totalBudget || 0
})

module.exports = mongoose.model('Program', programSchema)