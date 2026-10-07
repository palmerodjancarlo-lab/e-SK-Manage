const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

// Scope: Barangay Tawiran, Sta. Cruz, Marinduque only
const MUNICIPALITY = 'Santa Cruz'
const BARANGAY     = 'Tawiran'

// Roles in the system (admin merged into chairperson):
// sk_chairperson — HEAD. Full system control: manages user accounts, oversight,
//                  audit trail, approves finances/programs. (Also acts as "admin".)
// sk_secretary   — announcements, meetings, minutes, documents
// sk_treasurer   — budget, funds, expenses, financial records
// sk_kagawad     — committee work: records attendance, views all SK
// kabataan       — KK members, self-register, participate
// 'admin' is kept ONLY for backward-compatibility with any legacy seeded account;
// new deployments use sk_chairperson as the top role.
const ROLES = [
  'admin',            // legacy — treated the same as sk_chairperson
  'sk_chairperson',
  'sk_secretary',
  'sk_treasurer',
  'sk_kagawad',
  'kabataan',
]

const ROLE_PERMISSIONS = {
  // Chairperson = full head (SK duties + the old admin duties)
  sk_chairperson: [
    'manage_users', 'create_sk_accounts', 'view_audit_logs', 'view_all',
    'manage_programs', 'manage_projects', 'manage_activities',
    'manage_announcements', 'manage_meetings',
    'manage_finances', 'approve_expenses',
    'record_attendance', 'award_points', 'view_all_sk',
  ],
  // legacy admin kept identical to chairperson
  admin: [
    'manage_users', 'create_sk_accounts', 'view_audit_logs', 'view_all',
    'manage_programs', 'manage_projects', 'manage_activities',
    'manage_announcements', 'manage_meetings',
    'manage_finances', 'approve_expenses',
    'record_attendance', 'award_points', 'view_all_sk',
  ],
  sk_secretary: [
    'manage_announcements', 'manage_meetings', 'manage_documents',
    'record_attendance', 'view_all_sk',
  ],
  sk_treasurer: [
    'manage_finances', 'manage_budget', 'record_expenses',
    'view_all_sk',
  ],
  sk_kagawad: [
    'view_all_sk', 'record_attendance',
  ],
  kabataan: [
    'view_announcements', 'view_meetings', 'view_programs',
    'view_points', 'edit_own_profile',
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

  // Scope — fixed to Tawiran, Sta. Cruz
  municipality: { type:String, default: MUNICIPALITY },
  barangay:     { type:String, default: BARANGAY },

  // SK-specific
  position:      { type:String, trim:true, default:'' },  // committee / assigned role
  contactNumber: { type:String, trim:true, default:'' },
  photo:         { type:String, default:'' },
  address:       { type:String, trim:true, default:'' },
  purok:         { type:String, trim:true, default:'' },   // residency within Tawiran

  // ── Demographics (kabataan) ──
  sex:         { type:String, enum:['Male','Female',''], default:'' },
  isPWD:       { type:Boolean, default:false },
  birthDate:   { type:Date },
  civilStatus: { type:String, enum:['Single','Married','Widowed','Separated',''], default:'' },
  // Verification: a photo of a valid ID or proof of residency the chairperson reviews
  idPhoto:       { type:String, default:'' },   // Cloudinary URL
  idVerified:    { type:Boolean, default:false },// chairperson confirms residency
  idVerifiedBy:  { type:mongoose.Schema.Types.ObjectId, ref:'User', default:null },
  idVerifiedAt:  { type:Date, default:null },

  // Status
  isActive:   { type:Boolean, default:true },
  isVerified: { type:Boolean, default:false },   // email verified

  // Email verification code
  verificationCode:    { type:String, select:false },
  verificationExpires: { type:Date,   select:false },
  // Password reset code
  resetCode:    { type:String, select:false },
  resetExpires: { type:Date,   select:false },

  // Points — kabataan participation
  points: { type:Number, default:0 },

}, { timestamps:true })

// Virtual: age from birthDate
UserSchema.virtual('age').get(function() {
  if (!this.birthDate) return null
  const diff = Date.now() - this.birthDate.getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
})
UserSchema.set('toJSON',   { virtuals:true })
UserSchema.set('toObject', { virtuals:true })

// Hash password before save
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  const salt    = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password — guard against a missing hash so login never 500s
UserSchema.methods.matchPassword = async function(entered) {
  if (!this.password || !entered) return false
  return await bcrypt.compare(entered, this.password)
}

// Chairperson holds the old admin powers too
UserSchema.methods.isSKOfficial = function() {
  return ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'].includes(this.role)
}
UserSchema.methods.isHead = function() {
  return ['sk_chairperson','admin'].includes(this.role)
}

UserSchema.statics.ROLES            = ROLES
UserSchema.statics.ROLE_PERMISSIONS = ROLE_PERMISSIONS
UserSchema.statics.MUNICIPALITY     = MUNICIPALITY
UserSchema.statics.BARANGAY         = BARANGAY

module.exports = mongoose.model('User', UserSchema)