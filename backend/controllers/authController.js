// authController.js
// Handles registration, login, profile
const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')
const jwt      = require('jsonwebtoken')

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

// @POST /api/auth/register
// Puwedeng mag-register bilang kabataan_user o mag-apply bilang SK official
const register = async (req, res) => {
  try {
    console.log('Register body:', req.body)
    const {
      firstName, lastName, email, password,
      municipality, barangay,
      // SK application fields
      isApplyingSK, appliedPosition, whyApply, proofDescription,
    } = req.body

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields.' })
    }

    // Check if email already exists
    const exists = await User.findOne({ email })
    if (exists) {
      return res.status(400).json({ message: 'Email is already registered.' })
    }

    // Build user object — laging kabataan_user muna
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role:         'kabataan_user',  // always kabataan_user on signup
      municipality: municipality || 'Boac',
      barangay:     barangay    || '',
      isVerified:   true,
      isActive:     true,
    }

    // Kung nag-apply bilang SK official, i-save ang application
    if (isApplyingSK && appliedPosition) {
      userData.skApplication = {
        isApplying:      true,
        appliedPosition: appliedPosition,
        whyApply:        whyApply        || '',
        proofDescription:proofDescription || '',
        appliedAt:       new Date(),
        status:          'pending',
      }
    }

    const user = await User.create(userData)

    // Log the registration
    try {
      await AuditLog.create({
        user:    user._id,
        action:  'REGISTER',
        details: `New ${isApplyingSK ? 'SK applicant' : 'kabataan user'} registered: ${email}`
      })
    } catch (logErr) {
      console.log('Audit log error (non-critical):', logErr.message)
    }

    const message = isApplyingSK
      ? 'Account created! Your SK Official application is pending Admin review. You can use the Kabataan portal while waiting.'
      : 'Account created successfully! You can now sign in.'

    res.status(201).json({
      message,
      hasSKApplication: !!isApplyingSK,
      user: {
        _id:          user._id,
        firstName:    user.firstName,
        lastName:     user.lastName,
        email:        user.email,
        role:         user.role,
        municipality: user.municipality,
        barangay:     user.barangay,
      }
    })
  } catch (error) {
    console.error('Register error:', error)
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

    // Kailangan ng +password kasi select:false sa schema
    // Without this, password ay undefined at mag-crash ang bcrypt
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated. Contact your SK Admin.' })
    }

    // Log login
    try {
      await AuditLog.create({
        user:    user._id,
        action:  'LOGIN',
        details: `${user.email} logged in as ${user.role}`
      })
    } catch (logErr) {
      console.log('Log error:', logErr.message)
    }

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
        points:       user.points,
        isActive:     user.isActive,
        isVerified:   user.isVerified,
        skApplication: user.skApplication,
      }
    })
  } catch (error) {
    console.error('Login error:', error)
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

// @PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    // +password kailangan kasi select:false sa schema
    const user = await User.findById(req.user._id).select('+password')
    const isMatch = await user.matchPassword(currentPassword)
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' })
    }
    user.password = newPassword
    await user.save()
    res.json({ message: 'Password changed successfully.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, municipality, barangay } = req.body
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, municipality, barangay },
      { new: true }
    ).select('-password')
    res.json({ user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @DELETE /api/auth/account — user deletes their own account
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ message: 'Password is required to delete account.' })

    // Need +password to run matchPassword (select:false on schema)
    const user = await User.findById(req.user._id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found.' })

    const isMatch = await user.matchPassword(password)
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password.' })

    // Admin cannot delete their own account through this route
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be self-deleted. Contact your system developer.' })
    }

    await User.findByIdAndDelete(req.user._id)

    await AuditLog.create({
      user:    req.user._id,
      action:  'DELETE_ACCOUNT',
      details: `User deleted their own account: ${user.email}`,
    }).catch(() => {})

    res.json({ message: 'Account deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { register, login, getProfile, changePassword, updateProfile, deleteAccount }