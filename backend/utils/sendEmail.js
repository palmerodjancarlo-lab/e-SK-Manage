// utils/sendEmail.js
// Sends emails via Gmail using Nodemailer.
// Requires env vars: EMAIL_USER (your gmail), EMAIL_PASS (gmail app password)

const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// User-supplied text (names, addresses) must never be interpreted as HTML.
const esc = (v = '') => String(v).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

// Shared branded, mobile-friendly layout. `body` is trusted HTML built below.
const layout = (body) => `
  <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#F4F6FB;padding:24px;border-radius:16px">
    <div style="text-align:center;padding:24px 0">
      <div style="display:inline-block;background:#0F2740;color:#fff;font-size:22px;font-weight:800;width:56px;height:56px;line-height:56px;border-radius:14px">SK</div>
      <h1 style="font-size:20px;color:#0F2740;margin:16px 0 4px">Sangguniang Kabataan</h1>
      <p style="font-size:13px;color:#64748B;margin:0">Barangay Tawiran, Sta. Cruz, Marinduque</p>
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px 24px;text-align:center">${body}</div>
    <p style="text-align:center;font-size:11.5px;color:#94A3B8;margin:20px 0 0">e-SK Manage · Sangguniang Kabataan ng Barangay Tawiran</p>
  </div>`

const codeBlock = (code) =>
  `<div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#1D4ED8;background:#EFF4FF;border-radius:12px;padding:18px 0;margin:0 0 22px">${esc(code)}</div>`

const p = (text, style = 'font-size:14px;color:#64748B;line-height:1.6;margin:0 0 22px') =>
  `<p style="${style}">${text}</p>`
const greeting = (firstName) => p(`Hi ${esc(firstName)},`, 'font-size:15px;color:#0F2740;margin:0 0 6px')
const footnote = (text) => p(text, 'font-size:12.5px;color:#94A3B8;line-height:1.6;margin:0')

const send = (to, subject, body) => transporter.sendMail({
  from: `"e-SK Manage" <${process.env.EMAIL_USER}>`,
  to,
  subject,
  html: layout(body),
})

// Account verification code (registration)
const sendVerificationEmail = (to, firstName, code) => send(
  to,
  `${code} is your e-SK Manage verification code`,
  greeting(firstName)
    + p('Use this code to verify your email and finish creating your account:')
    + codeBlock(code)
    + footnote("This code expires in 10 minutes.<br/>If you didn't request this, you can ignore this email."),
)

// Password-reset code
const sendResetEmail = (to, firstName, code) => send(
  to,
  `${code} is your e-SK Manage password reset code`,
  greeting(firstName)
    + p('We got a request to reset your password. Enter this code to set a new one:')
    + codeBlock(code)
    + footnote("This code expires in 10 minutes.<br/>If you didn't request this, you can safely ignore this email — your password won't change."),
)

// Code sent to the NEW address when a user changes their email
const sendEmailChangeCode = (to, firstName, code) => send(
  to,
  `${code} is your code to confirm your new email`,
  greeting(firstName)
    + p('You asked to use this address for your e-SK Manage account. Enter this code to confirm it:')
    + codeBlock(code)
    + footnote("This code expires in 10 minutes.<br/>If you didn't request this, ignore this email — nothing will change."),
)

// Notice sent to the OLD address after the change is confirmed
const sendEmailChangedNotice = (to, firstName, newEmail) => send(
  to,
  'Your e-SK Manage email address was changed',
  greeting(firstName)
    + p(`The email address on your e-SK Manage account was changed to <b>${esc(newEmail)}</b>. Use the new address to sign in from now on.`)
    + footnote("If you didn't make this change, contact your SK Chairperson right away."),
)

// Public address of the web app, for links in emails.
const APP_URL = (process.env.CLIENT_URL || 'https://e-sk-manage.vercel.app').replace(/\/+$/, '')

const button = (label, path) =>
  `<a href="${esc(APP_URL + path)}" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:10px;margin:0 0 22px">${esc(label)}</a>`

// Sent when the SK Chairperson verifies a kabataan's residency
const sendResidencyVerifiedEmail = (to, firstName, releasedPoints = 0) => send(
  to,
  'Your e-SK Manage account is now verified',
  greeting(firstName)
    + p('Good news! The SK Chairperson has reviewed your ID and verified you as a resident of Barangay Tawiran. Your account is now fully verified.')
    + (releasedPoints ? p(`The <strong>${releasedPoints} points</strong> you earned from events you checked in to while waiting have been added to your account.`) : '')
    + button('Open e-SK Manage', '/kabataan')
    + footnote('You can now join SK activities, earn points, and redeem rewards.'),
)

// Sent when a previous verification is removed
const sendResidencyRemovedEmail = (to, firstName) => send(
  to,
  'Your e-SK Manage residency verification was removed',
  greeting(firstName)
    + p('The SK Chairperson removed the residency verification on your account. Please check that your ID in your profile is clear and up to date.')
    + button('Review my profile', '/kabataan/profile?tab=residency')
    + footnote('If you think this is a mistake, contact your SK Chairperson.'),
)

module.exports = {
  sendVerificationEmail, sendResetEmail, sendEmailChangeCode, sendEmailChangedNotice,
  sendResidencyVerifiedEmail, sendResidencyRemovedEmail,
}
