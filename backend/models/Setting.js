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
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

module.exports = mongoose.model('Setting', SettingSchema)