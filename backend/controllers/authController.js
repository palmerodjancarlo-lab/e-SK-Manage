// controllers/authController.js

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')
const jwt      = require('jsonwebtoken')

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

// @POST /api/auth/register
// ONLY kabataan can self-register
// SK officials get accounts created by Admin
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, contactNumber, address } = req.body

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields.' })
    }

    const exists = await User.findOne({ email })
    if (exists) {
      return res.status(400).json({ message: 'Email is already registered.' })
    }

    // Always kabataan — no role injection possible
    // Municipality and barangay fixed to Tawiran, Sta. Cruz
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role:         'kabataan',
      municipality: 'Santa Cruz',
      barangay:     'Tawiran',
      contactNumber: contactNumber || '',
      address:       address || '',
      isVerified:    true,
      isActive:      true,
    })

    await AuditLog.create({
      user:    user._id,
      action:  'REGISTER',
      details: `New kabataan registered: ${email}`,
    }).catch(() => {})

    res.status(201).json({
      message: 'Account created successfully! You can now sign in.',
      user: {
        _id:       user._id,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        role:      user.role,
        barangay:  user.barangay,
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' })

    const isMatch = await user.matchPassword(password)
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' })

    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated. Contact your SK Admin.' })
    }

    await AuditLog.create({
      user:    user._id,
      action:  'LOGIN',
      details: `${user.email} logged in as ${user.role}`,
    }).catch(() => {})

    res.json({
      token: generateToken(user._id),
      user: {
        _id:          user._id,
        firstName:    user.firstName,
        lastName:     user.lastName,
        email:        user.email,
        role:         user.role,
        position:     user.position,
        municipality: user.municipality,
        barangay:     user.barangay,
        points:       user.points,
        isActive:     user.isActive,
        photo:        user.photo,
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    res.json({ user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, contactNumber, address } = req.body

    // If email is being changed, make sure it's not already taken by someone else
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } })
      if (existing) {
        return res.status(400).json({ message: 'That email is already in use by another account.' })
      }
    }

    const updates = { firstName, lastName, contactNumber, address }
    if (email) updates.email = email

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password')

    res.json({ user, message: 'Profile updated successfully.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+password')
    const isMatch = await user.matchPassword(currentPassword)
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' })
    user.password = newPassword
    await user.save()

    await AuditLog.create({
      user:    req.user._id,
      action:  'CHANGE_PASSWORD',
      details: `${user.email} changed their password`,
    }).catch(() => {})

    res.json({ message: 'Password changed successfully.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @DELETE /api/auth/account
// Only kabataan can self-delete
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ message: 'Password is required to delete account.' })

    const user = await User.findById(req.user._id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found.' })

    const isMatch = await user.matchPassword(password)
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password.' })

    // SK officials and admin cannot self-delete
    if (user.role !== 'kabataan') {
      return res.status(403).json({ message: 'SK Official accounts cannot be self-deleted. Contact your Admin.' })
    }

    await User.findByIdAndDelete(req.user._id)

    await AuditLog.create({
      user:    req.user._id,
      action:  'DELETE_ACCOUNT',
      details: `Kabataan deleted their account: ${user.email}`,
    }).catch(() => {})

    res.json({ message: 'Account deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


// @GET /api/auth/members
// Any authenticated SK official or admin can view the roster
// (SK needs to see officials + kabataan for members page)
const getMembers = async (req, res) => {
  try {
    const User = require('../models/User')
    const { role } = req.query
    const filter = role ? { role } : {}
    const members = await User.find(filter)
      .select('firstName lastName email role points isActive municipality barangay position photo')
      .sort({ createdAt: -1 })
    res.json({ users: members })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { register, login, getProfile, updateProfile, changePassword, deleteAccount, getMembers }