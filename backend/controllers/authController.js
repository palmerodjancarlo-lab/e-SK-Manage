const User     = require('../models/User')
const jwt      = require('jsonwebtoken')
const AuditLog = require('../models/AuditLog')

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  })
}

// ── @POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    console.log('Register body:', req.body)

    const {
      firstName, lastName, email,
      password, role, municipality, barangay
    } = req.body

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' })
    }

    // Check if user exists
    const exists = await User.findOne({ email })
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role:         role         || 'kabataan_user',
      municipality: municipality || 'Boac',
      barangay:     barangay     || ''
    })

    // Log action safely
    try {
      await AuditLog.create({
        user:    user._id,
        action:  'REGISTER',
        details: `New user registered: ${email}`
      })
    } catch (logErr) {
      console.log('Audit log error (non-critical):', logErr.message)
    }

    res.status(201).json({
      message: 'Account created successfully. Please wait for admin verification.',
      user: {
        _id:          user._id,
        firstName:    user.firstName,
        lastName:     user.lastName,
        email:        user.email,
        role:         user.role,
        municipality: user.municipality,
        barangay:     user.barangay,
        isVerified:   user.isVerified
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: error.message })
  }
}
// ── @POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' })
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Check password
    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Check if active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated' })
    }

    // Log action
    await AuditLog.create({
      user: user._id,
      action: 'LOGIN',
      details: `User logged in: ${email}`
    })

    res.json({
      token: generateToken(user._id),
      user: {
        _id:          user._id,
        firstName:    user.firstName,
        lastName:     user.lastName,
        email:        user.email,
        role:         user.role,
        municipality: user.municipality,
        barangay:     user.barangay,
        position:     user.position,
        photo:        user.photo,
        points:       user.points,
        isVerified:   user.isVerified
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── @GET /api/auth/profile ────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    res.json({ user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── @PUT /api/auth/profile ────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const {
      firstName, lastName,
      contactNumber, barangay, position
    } = req.body

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, contactNumber, barangay, position },
      { new: true, runValidators: true }
    )

    res.json({ message: 'Profile updated', user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── @PUT /api/auth/change-password ───────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user._id).select('+password')
    const isMatch = await user.matchPassword(currentPassword)

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' })
    }

    user.password = newPassword
    await user.save()

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { register, login, getProfile, updateProfile, changePassword }