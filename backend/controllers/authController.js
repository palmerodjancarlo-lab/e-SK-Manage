// controllers/authController.js

const User     = require('../models/User')
const AuditLog = require('../models/AuditLog')
const jwt      = require('jsonwebtoken')
const { sendVerificationEmail, sendResetEmail } = require('../utils/sendEmail')

// Generate a 6-digit code
const genCode = () => String(Math.floor(100000 + Math.random() * 900000))

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

// @POST /api/auth/register
// ONLY kabataan can self-register
// SK officials get accounts created by Admin
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, contactNumber, address, purok,
            sex, isPWD, birthDate, civilStatus, idPhoto } = req.body

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please fill all required fields.' })
    }
    if (!address || !purok) {
      return res.status(400).json({ message: 'Please provide your purok and complete address in Barangay Tawiran.' })
    }
    if (!sex || !birthDate) {
      return res.status(400).json({ message: 'Please provide your sex and birthdate.' })
    }
    // SK age range 15–30
    const _age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25*24*60*60*1000))
    if (isNaN(_age) || _age < 15 || _age > 30) {
      return res.status(400).json({ message: 'SK membership is for ages 15 to 30. Please check your birthdate.' })
    }

    const exists = await User.findOne({ email })
    if (exists) {
      return res.status(400).json({ message: 'Email is already registered.' })
    }

    // Generate verification code (valid 10 minutes)
    const code = genCode()
    const expires = new Date(Date.now() + 10 * 60 * 1000)

    // Always kabataan — created UNVERIFIED until they enter the emailed code
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
      purok:         purok || '',
      sex:           sex || '',
      isPWD:         !!isPWD,
      birthDate:     birthDate || null,
      civilStatus:   civilStatus || '',
      idPhoto:       idPhoto || '',
      isVerified:          false,
      isActive:            true,
      verificationCode:    code,
      verificationExpires: expires,
    })

    // Send the code to their email
    try {
      await sendVerificationEmail(user.email, user.firstName, code)
    } catch (mailErr) {
      // If email fails, delete the half-created account so they can retry
      await User.findByIdAndDelete(user._id)
      return res.status(500).json({ message: 'Could not send verification email. Please check the address and try again.' })
    }

    await AuditLog.create({
      user:    user._id,
      action:  'REGISTER',
      details: `New kabataan registered (pending verification): ${email}`,
    }).catch(() => {})

    res.status(201).json({
      message: 'Verification code sent! Check your email.',
      email:   user.email,
      needsVerification: true,
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

    const user = await User.findOne({ email: (email || '').trim().toLowerCase() }).select('+password')
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' })

    const isMatch = await user.matchPassword(password)
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' })

    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated. Contact your SK Admin.' })
    }

    // Block unverified kabataan — they must verify their email first
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email first. Check your inbox for the code.',
        needsVerification: true,
        email: user.email,
      })
    }

    // Fire-and-forget — don't make the user wait on the audit write.
    AuditLog.create({
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
    const { firstName, lastName, email, contactNumber, address, purok, photo,
            sex, isPWD, birthDate, civilStatus, idPhoto } = req.body

    // If email is being changed, make sure it's not already taken by someone else
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } })
      if (existing) {
        return res.status(400).json({ message: 'That email is already in use by another account.' })
      }
    }

    const updates = { firstName, lastName, contactNumber, address, purok }
    if (sex !== undefined) updates.sex = sex
    if (isPWD !== undefined) updates.isPWD = !!isPWD
    if (birthDate) updates.birthDate = birthDate
    if (civilStatus !== undefined) updates.civilStatus = civilStatus
    if (idPhoto !== undefined) updates.idPhoto = idPhoto
    if (email) updates.email = email
    if (photo !== undefined) updates.photo = photo

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
    const { role } = req.query
    const filter = role ? { role } : {}
    // NOTE: include the verification/demographic fields the Members page needs
    // (idVerified is what drives the Verified/Pending badge — it was missing before).
    const members = await User.find(filter)
      .select([
        'firstName', 'lastName', 'email', 'role', 'position',
        'points', 'isActive', 'isVerified', 'idVerified', 'idVerifiedAt',
        'isPWD', 'sex', 'birthDate', 'civilStatus',
        'municipality', 'barangay', 'photo', 'address', 'purok',
        'contactNumber', 'createdAt',
      ].join(' '))
      .sort({ createdAt: -1 })
    res.json({ users: members })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/auth/verify-email
// User submits the 6-digit code they received
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body
    if (!email || !code) return res.status(400).json({ message: 'Email and code are required.' })

    const user = await User.findOne({ email }).select('+verificationCode +verificationExpires')
    if (!user) return res.status(404).json({ message: 'Account not found.' })

    if (user.isVerified) return res.status(400).json({ message: 'This account is already verified. You can sign in.' })

    if (!user.verificationCode || !user.verificationExpires) {
      return res.status(400).json({ message: 'No code on file. Please request a new one.' })
    }
    if (new Date() > user.verificationExpires) {
      return res.status(400).json({ message: 'Code expired. Please request a new one.' })
    }
    if (String(code).trim() !== user.verificationCode) {
      return res.status(400).json({ message: 'Incorrect code. Please check and try again.' })
    }

    // Success — mark verified and clear the code
    user.isVerified = true
    user.verificationCode = undefined
    user.verificationExpires = undefined
    await user.save()

    await AuditLog.create({
      user: user._id, action: 'VERIFY_EMAIL',
      details: `${user.email} verified their email`,
    }).catch(() => {})

    // Log them in right away — return a token
    res.json({
      message: 'Email verified! Welcome to e-SK Manage.',
      token: generateToken(user._id),
      user: {
        _id: user._id, firstName: user.firstName, lastName: user.lastName,
        email: user.email, role: user.role, barangay: user.barangay,
        points: user.points, isActive: user.isActive,
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/auth/resend-code
// Resend a fresh code if the first didn't arrive or expired
const resendCode = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required.' })

    const user = await User.findOne({ email }).select('+verificationCode +verificationExpires')
    if (!user) return res.status(404).json({ message: 'Account not found.' })
    if (user.isVerified) return res.status(400).json({ message: 'This account is already verified.' })

    const code = genCode()
    user.verificationCode = code
    user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000)
    await user.save()

    try {
      await sendVerificationEmail(user.email, user.firstName, code)
    } catch (mailErr) {
      return res.status(500).json({ message: 'Could not send the email. Please try again shortly.' })
    }

    res.json({ message: 'A new code is on the way. Check your email.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/auth/forgot-password
// User enters email → we send a 6-digit reset code
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required.' })

    const user = await User.findOne({ email: email.trim().toLowerCase() })
    // For privacy, respond the same whether or not the account exists
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset code is on the way.' })
    }

    const code = genCode()
    user.resetCode = code
    user.resetExpires = new Date(Date.now() + 10 * 60 * 1000)
    await user.save()

    try {
      await sendResetEmail(user.email, user.firstName, code)
    } catch (mailErr) {
      return res.status(500).json({ message: 'Could not send the email. Please try again shortly.' })
    }

    await AuditLog.create({
      user: user._id, action: 'FORGOT_PASSWORD',
      details: `${user.email} requested a password reset`,
    }).catch(() => {})

    res.json({ message: 'If that email is registered, a reset code is on the way.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/auth/reset-password
// User submits: email + code + newPassword
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password are required.' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+resetCode +resetExpires +password')
    if (!user) return res.status(404).json({ message: 'Account not found.' })

    if (!user.resetCode || !user.resetExpires) {
      return res.status(400).json({ message: 'No reset request on file. Please start again.' })
    }
    if (new Date() > user.resetExpires) {
      return res.status(400).json({ message: 'Code expired. Please request a new one.' })
    }
    if (String(code).trim() !== user.resetCode) {
      return res.status(400).json({ message: 'Incorrect code. Please check and try again.' })
    }

    // Set the new password (User model hashes it on save)
    user.password = newPassword
    user.resetCode = undefined
    user.resetExpires = undefined
    await user.save()

    await AuditLog.create({
      user: user._id, action: 'RESET_PASSWORD',
      details: `${user.email} reset their password`,
    }).catch(() => {})

    res.json({ message: 'Password reset! You can now sign in with your new password.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { register, login, getProfile, updateProfile, changePassword, deleteAccount, getMembers, verifyEmail, resendCode, forgotPassword, resetPassword }