// controllers/authController.js

const User     = require('../models/User')
const serverError = require('../utils/serverError')
const AuditLog = require('../models/AuditLog')
const jwt      = require('jsonwebtoken')
const crypto   = require('crypto')
const { sendVerificationEmail, sendResetEmail, sendEmailChangeCode, sendEmailChangedNotice } = require('../utils/sendEmail')
const { streamIdDocument } = require('../utils/idDocuments')
const cleanupUser = require('../utils/cleanupUser')

// Generate a 6-digit code from a cryptographically secure source
const genCode = () => String(crypto.randomInt(100000, 1000000))

// A code is thrown away after this many wrong guesses, so it cannot be brute-forced
const OTP_MAX_ATTEMPTS = 5

// Request bodies are untrusted JSON: anything that is not a plain string (e.g. a
// {"$ne": null} query operator) is treated as empty before it reaches a query.
const str = (v) => (typeof v === 'string' ? v.trim() : '')
const normEmail = (v) => str(v).toLowerCase()
const EMAIL_RE = /^\S+@\S+\.\S+$/

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

// Count one guess against a code BEFORE comparing it. The increment is a single
// atomic update, so parallel requests each consume an attempt and cannot race
// past the limit. Once the limit is exceeded the code itself is discarded.
const countGuess = async (userId, counterField, codeFields) => {
  const counted = await User.findByIdAndUpdate(
    userId, { $inc: { [counterField]: 1 } }, { new: true }
  ).select(`+${counterField}`)
  const attempts = counted?.[counterField] ?? Infinity
  if (attempts > OTP_MAX_ATTEMPTS) {
    const unset = Object.fromEntries(codeFields.map((f) => [f, 1]))
    await User.findByIdAndUpdate(userId, { $unset: unset, $set: { [counterField]: 0 } })
    return { locked: true, left: 0 }
  }
  return { locked: false, left: OTP_MAX_ATTEMPTS - attempts }
}

const wrongCodeMessage = (left) => (left > 0
  ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
  : 'Incorrect code. Please request a new code.')

// @POST /api/auth/register
// ONLY kabataan can self-register
// SK officials get accounts created by Admin
const register = async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, address, purok,
            sex, isPWD, birthDate, civilStatus } = req.body
    const email    = normEmail(req.body.email)
    const password = typeof req.body.password === 'string' ? req.body.password : ''

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
      isVerified:          false,
      isActive:            true,
      verificationCode:    code,
      verificationExpires: expires,
      verificationAttempts: 0,
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
    serverError(res, error)
  }
}

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const email    = normEmail(req.body.email)
    const password = typeof req.body.password === 'string' ? req.body.password : ''
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
    serverError(res, error)
  }
}

// @GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    res.json({ user })
  } catch (error) {
    serverError(res, error)
  }
}

// @PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, address, purok, photo,
            sex, isPWD, birthDate, civilStatus } = req.body

    // A new email address must be confirmed with a code first (POST /auth/change-email)
    const email = normEmail(req.body.email)
    if (email && email !== req.user.email) {
      return res.status(400).json({ message: 'To change your email, use "Change email" — we will send a code to the new address.' })
    }

    const updates = { firstName, lastName, contactNumber, address, purok }
    if (sex !== undefined) updates.sex = sex
    if (isPWD !== undefined) updates.isPWD = !!isPWD
    if (birthDate) updates.birthDate = birthDate
    if (civilStatus !== undefined) updates.civilStatus = civilStatus
    if (photo !== undefined) updates.photo = photo
    if (req.body.showContact !== undefined) updates.showContact = !!req.body.showContact

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password')

    res.json({ user, message: 'Profile updated successfully.' })
  } catch (error) {
    serverError(res, error)
  }
}

// @PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : ''
    const newPassword     = typeof req.body.newPassword === 'string' ? req.body.newPassword : ''
    if (!currentPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Enter your current password and a new password of at least 6 characters.' })
    }
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
    serverError(res, error)
  }
}

// @DELETE /api/auth/account
// Only kabataan can self-delete
const deleteAccount = async (req, res) => {
  try {
    const password = typeof req.body.password === 'string' ? req.body.password : ''
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
    await cleanupUser(req.user._id).catch((e) => console.error('[deleteAccount] cleanup failed:', e.message))

    await AuditLog.create({
      user:    req.user._id,
      action:  'DELETE_ACCOUNT',
      details: `Kabataan deleted their account: ${user.email}`,
    }).catch(() => {})

    res.json({ message: 'Account deleted successfully.' })
  } catch (error) {
    serverError(res, error)
  }
}


// @GET /api/auth/members
// Any authenticated SK official or admin can view the roster
// (SK needs to see officials + kabataan for members page)
const OFFICIAL_ROLES = ['admin', 'sk_chairperson', 'sk_secretary', 'sk_treasurer', 'sk_kagawad']

const getMembers = async (req, res) => {
  try {
    // Kabataan only get the public officials directory (SK Board) — never other
    // members' personal data (address, birthdate, PWD status, etc.).
    if (!OFFICIAL_ROLES.includes(req.user.role)) {
      const officials = await User.find({ role: { $in: OFFICIAL_ROLES }, isActive: true })
        .select('firstName lastName role position photo email contactNumber isActive showContact')
        .sort({ createdAt: 1 })
        .lean()
      // Contact details only when the official chose to publish them
      const users = officials.map(({ showContact, email, contactNumber, ...o }) =>
        (showContact === false ? o : { ...o, email, contactNumber }))
      return res.json({ users })
    }

    const role = str(req.query.role)
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
    serverError(res, error)
  }
}

// @POST /api/auth/verify-email
// User submits the 6-digit code they received
const verifyEmail = async (req, res) => {
  try {
    const email = normEmail(req.body.email)
    const code  = str(req.body.code)
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
    const guess = await countGuess(user._id, 'verificationAttempts', ['verificationCode', 'verificationExpires'])
    if (guess.locked) {
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.', codeExpired: true })
    }
    if (code !== user.verificationCode) {
      return res.status(400).json({ message: wrongCodeMessage(guess.left) })
    }

    // Success — mark verified and clear the code
    user.isVerified = true
    user.verificationCode = undefined
    user.verificationExpires = undefined
    user.verificationAttempts = 0
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
    serverError(res, error)
  }
}

// @POST /api/auth/resend-code
// Resend a fresh code if the first didn't arrive or expired
const resendCode = async (req, res) => {
  try {
    const email = normEmail(req.body.email)
    if (!email) return res.status(400).json({ message: 'Email is required.' })

    const user = await User.findOne({ email }).select('+verificationCode +verificationExpires')
    if (!user) return res.status(404).json({ message: 'Account not found.' })
    if (user.isVerified) return res.status(400).json({ message: 'This account is already verified.' })

    const code = genCode()
    user.verificationCode = code
    user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000)
    user.verificationAttempts = 0
    await user.save()

    try {
      await sendVerificationEmail(user.email, user.firstName, code)
    } catch (mailErr) {
      return res.status(500).json({ message: 'Could not send the email. Please try again shortly.' })
    }

    res.json({ message: 'A new code is on the way. Check your email.' })
  } catch (error) {
    serverError(res, error)
  }
}

// @POST /api/auth/forgot-password
// User enters email → we send a 6-digit reset code
const forgotPassword = async (req, res) => {
  try {
    const email = normEmail(req.body.email)
    if (!email) return res.status(400).json({ message: 'Email is required.' })

    const user = await User.findOne({ email })
    // For privacy, respond the same whether or not the account exists
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset code is on the way.' })
    }

    const code = genCode()
    user.resetCode = code
    user.resetExpires = new Date(Date.now() + 10 * 60 * 1000)
    user.resetAttempts = 0
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
    serverError(res, error)
  }
}

// @POST /api/auth/reset-password
// User submits: email + code + newPassword
const resetPassword = async (req, res) => {
  try {
    const email       = normEmail(req.body.email)
    const code        = str(req.body.code)
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : ''
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password are required.' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    const user = await User.findOne({ email }).select('+resetCode +resetExpires +password')
    if (!user) return res.status(404).json({ message: 'Account not found.' })

    if (!user.resetCode || !user.resetExpires) {
      return res.status(400).json({ message: 'No reset request on file. Please start again.' })
    }
    if (new Date() > user.resetExpires) {
      return res.status(400).json({ message: 'Code expired. Please request a new one.' })
    }
    const guess = await countGuess(user._id, 'resetAttempts', ['resetCode', 'resetExpires'])
    if (guess.locked) {
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.', codeExpired: true })
    }
    if (code !== user.resetCode) {
      return res.status(400).json({ message: wrongCodeMessage(guess.left) })
    }

    // Set the new password (User model hashes it on save)
    user.password = newPassword
    user.resetCode = undefined
    user.resetExpires = undefined
    user.resetAttempts = 0
    await user.save()

    await AuditLog.create({
      user: user._id, action: 'RESET_PASSWORD',
      details: `${user.email} reset their password`,
    }).catch(() => {})

    res.json({ message: 'Password reset! You can now sign in with your new password.' })
  } catch (error) {
    serverError(res, error)
  }
}

// @POST /api/auth/change-email
// Step 1: confirm identity with the current password, then email a code to the NEW address.
const requestEmailChange = async (req, res) => {
  try {
    const newEmail = normEmail(req.body.newEmail)
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    if (!EMAIL_RE.test(newEmail)) return res.status(400).json({ message: 'Enter a valid email address.' })
    if (!password) return res.status(400).json({ message: 'Enter your current password to continue.' })

    const user = await User.findById(req.user._id).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    if (!(await user.matchPassword(password))) return res.status(400).json({ message: 'Current password is incorrect.' })
    if (newEmail === user.email) return res.status(400).json({ message: 'That is already your email address.' })
    if (await User.exists({ email: newEmail })) {
      return res.status(409).json({ message: 'That email is already used by another account.' })
    }

    const code = genCode()
    user.pendingEmail        = newEmail
    user.emailChangeCode     = code
    user.emailChangeExpires  = new Date(Date.now() + 10 * 60 * 1000)
    user.emailChangeAttempts = 0
    await user.save()

    try {
      await sendEmailChangeCode(newEmail, user.firstName, code)
    } catch (mailErr) {
      await User.findByIdAndUpdate(user._id, {
        $set: { pendingEmail: '' }, $unset: { emailChangeCode: 1, emailChangeExpires: 1 },
      })
      return res.status(502).json({ message: 'Could not send the code to that address. Check it and try again.' })
    }

    res.json({ message: `We sent a 6-digit code to ${newEmail}.`, pendingEmail: newEmail })
  } catch (error) {
    serverError(res, error)
  }
}

// @POST /api/auth/change-email/confirm
// Step 2: the code proves the user controls the new address; only now is `email` replaced.
const confirmEmailChange = async (req, res) => {
  try {
    const code = str(req.body.code)
    if (!code) return res.status(400).json({ message: 'Enter the 6-digit code.' })

    const user = await User.findById(req.user._id).select('+emailChangeCode +emailChangeExpires')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    if (!user.pendingEmail || !user.emailChangeCode) {
      return res.status(400).json({ message: 'There is no email change waiting for confirmation.' })
    }
    if (new Date() > user.emailChangeExpires) {
      return res.status(400).json({ message: 'Code expired. Please request a new one.', codeExpired: true })
    }

    const guess = await countGuess(user._id, 'emailChangeAttempts', ['emailChangeCode', 'emailChangeExpires'])
    if (guess.locked) {
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.', codeExpired: true })
    }
    if (code !== user.emailChangeCode) {
      return res.status(400).json({ message: wrongCodeMessage(guess.left) })
    }

    // Someone may have registered the address while the code was pending
    if (await User.exists({ email: user.pendingEmail, _id: { $ne: user._id } })) {
      return res.status(409).json({ message: 'That email was taken by another account in the meantime.' })
    }

    const oldEmail = user.email
    user.email               = user.pendingEmail
    user.pendingEmail        = ''
    user.emailChangeCode     = undefined
    user.emailChangeExpires  = undefined
    user.emailChangeAttempts = 0
    await user.save()

    sendEmailChangedNotice(oldEmail, user.firstName, user.email).catch(() => {})
    AuditLog.create({
      user: user._id, action: 'CHANGE_EMAIL',
      details: `${user.firstName} ${user.lastName} changed their email from ${oldEmail} to ${user.email}`,
    }).catch(() => {})

    const fresh = await User.findById(user._id).select('-password')
    res.json({ message: 'Email updated. Use your new address to sign in.', user: fresh })
  } catch (error) {
    serverError(res, error)
  }
}

// @DELETE /api/auth/change-email — abandon a pending change
const cancelEmailChange = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { pendingEmail: '', emailChangeAttempts: 0 },
      $unset: { emailChangeCode: 1, emailChangeExpires: 1 },
    })
    res.json({ message: 'Email change cancelled.' })
  } catch (error) {
    serverError(res, error)
  }
}

// @GET /api/auth/id-document — a member viewing the ID they submitted
const getMyIdDocument = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+idDocument')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    await streamIdDocument(res, user)
  } catch (error) {
    serverError(res, error)
  }
}

module.exports = {
  register, login, getProfile, updateProfile, changePassword, deleteAccount, getMembers,
  verifyEmail, resendCode, forgotPassword, resetPassword,
  requestEmailChange, confirmEmailChange, cancelEmailChange, getMyIdDocument,
}