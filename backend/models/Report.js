// models/Report.js
// Stores a generated report (e.g. ABYIP, CBYDP) with an editable snapshot of its
// data, so a finalized/submitted copy always reflects the figures at that time.
const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['abyip', 'cbydp', 'financial', 'ppa', 'accomplishment', 'attendance', 'custom'],
    default: 'abyip',
  },
  fiscalYear: { type: Number },              // for ABYIP (single year)
  periodStart: { type: Date },
  periodEnd: { type: Date },

  // The editable form content (funding header, areas, rows, signatories…)
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Computed totals snapshot
  summary: { type: mongoose.Schema.Types.Mixed, default: {} },

  fileUrl: { type: String, default: '' },    // optional exported copy
  status: { type: String, enum: ['draft', 'finalized', 'submitted'], default: 'draft' },

  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, default: '' },
}, { timestamps: true })

module.exports = mongoose.model('Report', reportSchema)