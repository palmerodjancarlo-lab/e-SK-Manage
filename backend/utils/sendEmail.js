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

// Send a verification code email — branded, mobile-friendly HTML
const sendVerificationEmail = async (to, firstName, code) => {
  const html = `
  <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#F4F6FB;padding:24px;border-radius:16px">
    <div style="text-align:center;padding:24px 0">
      <div style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;font-size:22px;font-weight:800;width:56px;height:56px;line-height:56px;border-radius:14px">SK</div>
      <h1 style="font-size:20px;color:#0F1F5C;margin:16px 0 4px">e-SK Manage</h1>
      <p style="font-size:13px;color:#64748B;margin:0">Barangay Tawiran, Santa Cruz</p>
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px 24px;text-align:center">
      <p style="font-size:15px;color:#0F1F5C;margin:0 0 6px">Hi ${firstName}! 👋</p>
      <p style="font-size:14px;color:#64748B;line-height:1.6;margin:0 0 22px">Use this code to verify your email and finish creating your account:</p>
      <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#4F46E5;background:#EEF0FF;border-radius:12px;padding:18px 0;margin:0 0 22px">${code}</div>
      <p style="font-size:12.5px;color:#94A3B8;line-height:1.6;margin:0">This code expires in 10 minutes.<br/>If you didn't request this, you can ignore this email.</p>
    </div>
    <p style="text-align:center;font-size:11.5px;color:#94A3B8;margin:20px 0 0">Sangguniang Kabataan · Barangay Tawiran</p>
  </div>`

  await transporter.sendMail({
    from: `"e-SK Manage" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} is your e-SK Manage verification code`,
    html,
  })
}

// Send a password-reset code email
const sendResetEmail = async (to, firstName, code) => {
  const html = `
  <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#F4F6FB;padding:24px;border-radius:16px">
    <div style="text-align:center;padding:24px 0">
      <div style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;font-size:22px;font-weight:800;width:56px;height:56px;line-height:56px;border-radius:14px">SK</div>
      <h1 style="font-size:20px;color:#0F1F5C;margin:16px 0 4px">e-SK Manage</h1>
      <p style="font-size:13px;color:#64748B;margin:0">Barangay Tawiran, Santa Cruz</p>
    </div>
    <div style="background:#fff;border-radius:16px;padding:28px 24px;text-align:center">
      <p style="font-size:15px;color:#0F1F5C;margin:0 0 6px">Hi ${firstName},</p>
      <p style="font-size:14px;color:#64748B;line-height:1.6;margin:0 0 22px">We got a request to reset your password. Enter this code to set a new one:</p>
      <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#4F46E5;background:#EEF0FF;border-radius:12px;padding:18px 0;margin:0 0 22px">${code}</div>
      <p style="font-size:12.5px;color:#94A3B8;line-height:1.6;margin:0">This code expires in 10 minutes.<br/>If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>
    <p style="text-align:center;font-size:11.5px;color:#94A3B8;margin:20px 0 0">Sangguniang Kabataan · Barangay Tawiran</p>
  </div>`

  await transporter.sendMail({
    from: `"e-SK Manage" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} is your e-SK Manage password reset code`,
    html,
  })
}

module.exports = { sendVerificationEmail, sendResetEmail }