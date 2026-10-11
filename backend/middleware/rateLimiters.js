// middleware/rateLimiters.js
// Per-IP request limits for the public auth endpoints. These slow down password
// guessing and code guessing; the per-account attempt counter in authController
// is what actually caps guesses against a single code.
//
// Limits are generous enough for a registration drive where many kabataan share
// one barangay Wi-Fi connection (same public IP).

const { rateLimit } = require('express-rate-limit')

const make = (windowMinutes, limit, message, extra = {}) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message },
  ...extra,
})

// Only failed sign-ins count, so a busy shared network is not locked out.
const loginLimiter = make(15, 20, 'Too many failed sign-in attempts. Please wait 15 minutes and try again.', {
  skipSuccessfulRequests: true,
})

// Entering emailed codes (verify email, reset password).
const codeLimiter = make(15, 20, 'Too many code attempts. Please wait a few minutes and try again.')

// Endpoints that send an email (resend code, forgot password).
const emailLimiter = make(15, 8, 'Too many email requests. Please wait 15 minutes before trying again.')

// New account sign-ups.
const registerLimiter = make(60, 30, 'Too many registrations from this network. Please try again later.')

module.exports = { loginLimiter, codeLimiter, emailLimiter, registerLimiter }
