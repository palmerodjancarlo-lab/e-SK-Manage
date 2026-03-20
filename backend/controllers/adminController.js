const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')

// @GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.json({ users })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/admin/users/:id/role
const updateRole = async (req, res) => {
  try {
    const { role } = req.body
    const user = await User.findByIdAndUpdate(
      req.params.id, { role }, { new: true }
    )
    await AuditLog.create({
      user: req.user._id,
      action: 'UPDATE_ROLE',
      details: `Changed ${user.email} role to ${role}`
    })
    res.json({ message: 'Role updated', user })
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
    await AuditLog.create({
      user: req.user._id,
      action: user.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      details: `${user.isActive ? 'Activated' : 'Deactivated'} user: ${user.email}`
    })
    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      user
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id)
    res.json({ message: 'User deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/admin/logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog
      .find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(100)
    res.json({ logs })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, pendingUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isVerified: false })
    ])
    res.json({ stats: { totalUsers, activeUsers, pendingUsers } })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getUsers, updateRole, toggleActive,
  deleteUser, getAuditLogs, getStats
}