const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

// Scope: Barangay Tawiran, Sta. Cruz, Marinduque only
// Can expand to other barangays in the future

const MUNICIPALITY = 'Santa Cruz'
const BARANGAY     = 'Tawiran'

// Roles in the system:
// admin          — IT Staff, manages all user accounts
// sk_chairperson — SK Chairperson, full SK access, approves projects/finances
// sk_secretary   — handles announcements, meeting minutes, documents
// sk_treasurer   — handles budget, expenses, financial records
// sk_kagawad     — the other 5 SK officials, basic SK access
// kabataan       — KK members, self-register, view and participate

const ROLES = [
  'admin',
  'sk_chairperson',
  'sk_secretary',
  'sk_treasurer',
  'sk_kagawad',
  'kabataan',
]

// What each role can do — used in authorize() middleware
const ROLE_PERMISSIONS = {
  admin: [
    'manage_users',
    'create_sk_accounts',
    'view_audit_logs',
    'view_all',
  ],
  sk_chairperson: [
    'manage_programs',
    'manage_projects',
    'manage_activities',
    'manage_announcements',
    'manage_meetings',
    'manage_finances',
    'approve_expenses',
    'record_attendance',
    'award_points',
    'view_all_sk',
  ],
  sk_secretary: [
    'manage_announcements',
    'manage_meetings',
    'manage_documents',
    'record_attendance',
    'view_all_sk',
  ],
  sk_treasurer: [
    'manage_finances',
    'manage_budget',
    'record_expenses',
    'approve_expenses',
    'view_all_sk',
  ],
  sk_kagawad: [
    'view_all_sk',
    'record_attendance',
  ],
  kabataan: [
    'view_announcements',
    'view_meetings',
    'view_programs',
    'view_points',
    'edit_own_profile',
  ],
}

const UserSchema = new mongoose.Schema({
  firstName: { type:String, required:[true,'First name is required'], trim:true },
  lastName:  { type:String, required:[true,'Last name is required'],  trim:true },
  email: {
    type:      String,
    required:  [true,'Email is required'],
    unique:    true,
    lowercase: true,
    trim:      true,
    match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type:      String,
    required:  [true,'Password is required'],
    minlength: [6,'Password must be at least 6 characters'],
    select:    false,
  },
  role: {
    type:    String,
    enum:    ROLES,
    default: 'kabataan',
  },

  // Scope — fixed to Tawiran, Sta. Cruz for now
  municipality: { type:String, default: MUNICIPALITY },
  barangay:     { type:String, default: BARANGAY },

  // SK-specific fields
  position:      { type:String, trim:true, default:'' },  // e.g. "SK Kagawad - Education"
  contactNumber: { type:String, trim:true, default:'' },
  photo:         { type:String, default:'' },
  address:       { type:String, trim:true, default:'' },

  // Status
  isActive:   { type:Boolean, default:true },
  isVerified: { type:Boolean, default:false },

  // Points — for kabataan participation tracking
  points: { type:Number, default:0 },

}, { timestamps:true })

// Hash password before save
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  const salt    = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password
UserSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password)
}

// Helper: check if role is an SK official
UserSchema.methods.isSKOfficial = function() {
  return ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'].includes(this.role)
}

UserSchema.statics.ROLES            = ROLES
UserSchema.statics.ROLE_PERMISSIONS = ROLE_PERMISSIONS
UserSchema.statics.MUNICIPALITY     = MUNICIPALITY
UserSchema.statics.BARANGAY         = BARANGAY

module.exports = mongoose.model('User', UserSchema)