// controllers/adminController.js
// Admin manages all user accounts
// Admin creates SK official accounts — they cannot self-register

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

// Roles admin can create
const SK_ROLES = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

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
    if (['sk_chairperson','sk_secretary','sk_treasurer'].includes(role)) {
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
    const [total, active, kabataan, skOfficials] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive:true }),
      User.countDocuments({ role:'kabataan' }),
      User.countDocuments({ role:{ $in: ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'] } }),
    ])
    res.json({ stats: { totalUsers:total, activeUsers:active, kabataanCount:kabataan, skOfficialCount:skOfficials } })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/admin/logs
const getAuditLogs = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog')
    const logs = await AuditLog.find()
      .populate('user','firstName lastName email role')
      .sort({ createdAt:-1 })
      .limit(100)
    res.json({ logs })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getUsers, getUser, createSKAccount, updateUser,
  toggleActive, resetPassword, deleteUser,
  getStats, getAuditLogs,
}