// adminController.js
// Admin CRUD for users + SK application review

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

// @GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password')
    res.json({ users })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/admin/sk-applications
const getSKApplications = async (req, res) => {
  try {
    const applicants = await User.find({
      'skApplication.isApplying': true,
      'skApplication.status':     'pending',
    }).select('-password').sort({ 'skApplication.appliedAt': -1 })
    res.json({ applicants })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/admin/sk-applications/:id/approve
// I-approve ang SK application — i-upgrade ang role sa sk_officer
const approveSKApplication = async (req, res) => {
  try {
    const { position } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    user.role     = 'sk_officer'
    user.position = position || user.skApplication?.appliedPosition || 'SK Officer'
    user.skApplication.status     = 'approved'
    user.skApplication.reviewedBy = req.user._id
    user.skApplication.reviewedAt = new Date()
    await user.save()

    await AuditLog.create({
      user:    req.user._id,
      action:  'APPROVE_SK_APPLICATION',
      details: `Approved SK application of ${user.email} as ${user.position}`
    })

    res.json({ message: `${user.firstName} ${user.lastName} is now an SK Officer.`, user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/admin/sk-applications/:id/reject
// I-reject ang SK application
const rejectSKApplication = async (req, res) => {
  try {
    const { reason } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    user.skApplication.status       = 'rejected'
    user.skApplication.reviewedBy   = req.user._id
    user.skApplication.reviewedAt   = new Date()
    user.skApplication.rejectReason = reason || ''
    await user.save()

    await AuditLog.create({
      user:    req.user._id,
      action:  'REJECT_SK_APPLICATION',
      details: `Rejected SK application of ${user.email}. Reason: ${reason || 'Not specified'}`
    })

    res.json({ message: 'Application rejected.', user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/admin/create-user
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, municipality, barangay, position } = req.body
    const allowedRoles = ['sk_officer']
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Can only create SK Officer accounts.' })
    }
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ message: 'Email already registered.' })

    const user = await User.create({
      firstName, lastName, email,
      password:     password || 'SKManage2026',
      role,
      municipality: municipality || 'Boac',
      barangay:     barangay    || '',
      position:     position    || '',
      isVerified:   true,
      isActive:     true,
    })

    await AuditLog.create({
      user:    req.user._id,
      action:  'CREATE_USER',
      details: `Admin created ${role} account: ${email}`
    })

    res.status(201).json({
      message: `${'SK Officer'} account created.`,
      user,
      defaultPassword: password || 'SKManage2025'
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/admin/users/:id/role
const updateRole = async (req, res) => {
  try {
    const { role } = req.body
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true })
    await AuditLog.create({ user: req.user._id, action: 'UPDATE_ROLE', details: `Changed ${user.email} role to ${role}` })
    res.json({ message: 'Role updated.', user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/admin/users/:id/toggle
const toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    user.isActive = !user.isActive
    await user.save()
    await AuditLog.create({ user: req.user._id, action: user.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', details: `${user.isActive ? 'Activated' : 'Deactivated'}: ${user.email}` })
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id)
    res.json({ message: 'User deleted.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/admin/logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().populate('user', 'firstName lastName email').sort({ createdAt: -1 }).limit(100)
    res.json({ logs })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, pendingUsers, pendingApplications] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isVerified: false }),
      User.countDocuments({ 'skApplication.isApplying': true, 'skApplication.status': 'pending' }),
    ])
    res.json({ stats: { totalUsers, activeUsers, pendingUsers, pendingApplications } })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getUsers,
  getSKApplications,
  approveSKApplication,
  rejectSKApplication,
  createUser,
  updateRole,
  toggleActive,
  deleteUser,
  getAuditLogs,
  getStats,
}