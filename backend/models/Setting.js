// models/Setting.js
// Singleton document holding public, admin-editable site settings
// (e.g. the Contact block shown on the landing page).
const mongoose = require('mongoose')

const SettingSchema = new mongoose.Schema({
  key:      { type: String, default: 'site', unique: true }, // single row
  address:  { type: String, default: 'SK Office, Barangay Tawiran, Sta. Cruz, Marinduque' },
  email:    { type: String, default: 'sktawiran@gmail.com' },
  phone:    { type: String, default: '' },
  facebook: { type: String, default: '' },
  // Budget figure the Chairperson publishes to kabataan (Budget Transparency page).
  // null = not published; kabataan then see spending only. Spending itself always
  // comes from approved expenses and can't be set here. Changes are audit-logged.
  publishedBudget: {
    amount:    { type: Number, default: null, min: 0 },
    label:     { type: String, default: '', trim: true, maxlength: 80 },
    updatedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

module.exports = mongoose.model('Setting', SettingSchema)