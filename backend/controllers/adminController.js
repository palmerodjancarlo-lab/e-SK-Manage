// controllers/adminController.js
// Admin manages all user accounts
// Admin creates SK official accounts — they cannot self-register

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

// Roles admin can create
const SK_ROLES = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
const SINGLE_ROLES = ['sk_chairperson','sk_secretary','sk_treasurer']
const DEFAULT_TEMP_PASSWORD = 'SKManage2026'

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { role } = req.query
    const filter = role ? { role } : {}
    const users = await User.find(filter).sort({ createdAt:-1 }).select('-password')
    res.json({ users })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/admin/users/:id
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json({ user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/admin/create-sk
// Admin creates SK official accounts
const createSKAccount = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, position, contactNumber, address } = req.body

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' })
    }

    // Only SK roles allowed through this route
    if (!SK_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${SK_ROLES.join(', ')}` })
    }

    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ message: 'Email already registered.' })

    // Check role limits — only 1 chairperson, 1 secretary, 1 treasurer allowed
    if (SINGLE_ROLES.includes(role)) {
      const existing = await User.findOne({ role })
      if (existing) {
        return res.status(400).json({ message: `There is already an existing ${role.replace('sk_','SK ')}. Only one is allowed.` })
      }
    }

    const user = await User.create({
      firstName, lastName, email, password,
      role, position: position || '',
      contactNumber: contactNumber || '',
      address:       address || '',
      municipality: 'Santa Cruz',
      barangay:     'Tawiran',
      isVerified:   true,
      isActive:     true,
    })

    await AuditLog.create({
      user:    req.user._id,
      action:  'CREATE_SK_ACCOUNT',
      details: `Admin created SK account: ${email} as ${role}`,
    })

    res.status(201).json({
      message: `${role.replace('sk_','SK ')} account created successfully.`,
      user: {
        _id:      user._id,
        firstName:user.firstName,
        lastName: user.lastName,
        email:    user.email,
        role:     user.role,
        position: user.position,
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/admin/bulk-create-sk
// Admin creates many SK official accounts from an uploaded roster (parsed on the client).
// Body: { officers: [{ firstName, lastName, email, role, password?, position?, contactNumber?, address? }] }
const bulkCreateSK = async (req, res) => {
  try {
    const { officers } = req.body
    if (!Array.isArray(officers) || officers.length === 0) {
      return res.status(400).json({ message: 'No officers to create.' })
    }

    // which single-only roles are already taken (in the DB)
    const takenSingles = {}
    for (const r of SINGLE_ROLES) {
      takenSingles[r] = !!(await User.findOne({ role: r }))
    }

    const created = []
    const skipped = []
    const seenEmails = new Set()

    for (let i = 0; i < officers.length; i++) {
      const o = officers[i] || {}
      const firstName = String(o.firstName || '').trim()
      const lastName  = String(o.lastName || '').trim()
      const email     = String(o.email || '').trim().toLowerCase()
      const role      = o.role
      const password  = (o.password && String(o.password).length >= 6) ? String(o.password) : DEFAULT_TEMP_PASSWORD
      const label     = email || `${firstName} ${lastName}`.trim() || `Row ${i + 1}`

      if (!firstName || !lastName || !email || !role) { skipped.push({ row: i + 1, label, reason: 'Missing name, email, or role.' }); continue }
      if (!SK_ROLES.includes(role)) { skipped.push({ row: i + 1, label, reason: 'Invalid role.' }); continue }
      if (!/^\S+@\S+\.\S+$/.test(email)) { skipped.push({ row: i + 1, label, reason: 'Invalid email address.' }); continue }
      if (seenEmails.has(email)) { skipped.push({ row: i + 1, label, reason: 'Duplicate email in the file.' }); continue }
      if (SINGLE_ROLES.includes(role) && takenSingles[role]) {
        skipped.push({ row: i + 1, label, reason: `An ${role.replace('sk_', 'SK ')} already exists — only one allowed.` }); continue
      }

      const exists = await User.findOne({ email })
      if (exists) { skipped.push({ row: i + 1, label, reason: 'Email already registered.' }); continue }

      try {
        const user = await User.create({
          firstName, lastName, email, password, role,
          position: o.position || '', contactNumber: o.contactNumber || '', address: o.address || '',
          municipality: 'Santa Cruz', barangay: 'Tawiran', isVerified: true, isActive: true,
        })
        seenEmails.add(email)
        if (SINGLE_ROLES.includes(role)) takenSingles[role] = true
        created.push({ _id: user._id, firstName, lastName, email, role })
      } catch (e) {
        skipped.push({ row: i + 1, label, reason: e.message || 'Could not create account.' })
      }
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'BULK_CREATE_SK',
      details: `Admin bulk-created ${created.length} SK account(s); ${skipped.length} skipped.`,
    }).catch(() => {})

    res.status(201).json({ created, skipped, summary: { created: created.length, skipped: skipped.length } })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/admin/users/:id
// Update any user info
const updateUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body // never update password here
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new:true }).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })

    await AuditLog.create({
      user:    req.user._id,
      action:  'UPDATE_USER',
      details: `Admin updated user: ${user.email}`,
    })

    res.json({ message: 'User updated.', user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/admin/users/:id/toggle
// Activate or deactivate account
const toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    user.isActive = !user.isActive
    await user.save()

    await AuditLog.create({
      user:    req.user._id,
      action:  'TOGGLE_USER',
      details: `Admin ${user.isActive ? 'activated' : 'deactivated'} account: ${user.email}`,
    })

    res.json({ message: `Account ${user.isActive ? 'activated' : 'deactivated'}.`, user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/admin/users/:id/reset-password
// Admin resets a user's password
const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword) return res.status(400).json({ message: 'New password is required.' })

    const user = await User.findById(req.params.id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found.' })

    user.password = newPassword
    await user.save()

    await AuditLog.create({
      user:    req.user._id,
      action:  'RESET_PASSWORD',
      details: `Admin reset password for: ${user.email}`,
    })

    res.json({ message: 'Password reset successfully.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    await AuditLog.create({
      user:    req.user._id,
      action:  'DELETE_USER',
      details: `Admin deleted user: ${user.email} (${user.role})`,
    })

    res.json({ message: 'User deleted.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [total, active, kabataan, skOfficials, male, female, pwd, verified] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive:true }),
      User.countDocuments({ role:'kabataan' }),
      User.countDocuments({ role:{ $in: ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'] } }),
      User.countDocuments({ role:'kabataan', sex:'Male' }),
      User.countDocuments({ role:'kabataan', sex:'Female' }),
      User.countDocuments({ role:'kabataan', isPWD:true }),
      User.countDocuments({ role:'kabataan', idVerified:true }),
    ])
    res.json({ stats: {
      totalUsers:total, activeUsers:active, kabataanCount:kabataan, skOfficialCount:skOfficials,
      maleCount:male, femaleCount:female, pwdCount:pwd, verifiedCount:verified,
    } })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/admin/logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('user','firstName lastName email role')
      .sort({ createdAt:-1 })
      .limit(200)
    res.json({ logs })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PUT /api/admin/users/:id/verify  — head confirms a kabataan is a real Tawiran resident
const verifyResidency = async (req, res) => {
  try {
    const { verified } = req.body
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { idVerified: !!verified, idVerifiedBy: req.user._id, idVerifiedAt: new Date() },
      { new: true }
    ).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    await AuditLog.create({
      user: req.user._id, action: verified ? 'VERIFY_RESIDENCY' : 'UNVERIFY_RESIDENCY',
      details: `${req.user.firstName} ${req.user.lastName} ${verified?'verified':'un-verified'} residency of ${user.firstName} ${user.lastName}`,
    }).catch(()=>{})
    res.json({ message: verified ? 'Resident verified.' : 'Verification removed.', user })
  } catch (error) { res.status(500).json({ message: error.message }) }
}

module.exports = {
  getUsers, getUser, createSKAccount, bulkCreateSK, updateUser,
  toggleActive, resetPassword, deleteUser,
  getStats, getAuditLogs, verifyResidency,
}