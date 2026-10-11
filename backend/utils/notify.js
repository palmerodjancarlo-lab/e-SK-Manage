// utils/notify.js
// Creates in-app notifications and sends the matching email. Delivery problems
// are logged, never thrown: the action that triggered them has already happened.
const Notification = require('../models/Notification')
const { sendResidencyVerifiedEmail, sendResidencyRemovedEmail } = require('./sendEmail')

const log = (what) => (err) => console.error(`[notify] ${what} failed:`, err.message)

// `user` needs _id, email and firstName; `released` = held points just added to their balance.
// Returns a promise that always resolves.
const notifyResidencyChange = (user, verified, released = 0) => {
  const inApp = Notification.create(verified
    ? {
        user: user._id, type: 'RESIDENCY_VERIFIED', link: '/kabataan/profile?tab=residency',
        title: 'Your account is verified',
        message: released
          ? `The SK Chairperson verified you as a resident of Barangay Tawiran. The ${released} points from events you checked in to are now in your account.`
          : 'The SK Chairperson verified you as a resident of Barangay Tawiran. You can now join activities, earn points and redeem rewards.',
      }
    : {
        user: user._id, type: 'RESIDENCY_UNVERIFIED', link: '/kabataan/profile?tab=residency',
        title: 'Residency verification removed',
        message: 'Please check that your ID is clear and up to date, or contact the SK Chairperson.',
      }).catch(log('in-app notification'))

  const email = user.email
    ? (verified ? sendResidencyVerifiedEmail(user.email, user.firstName, released) : sendResidencyRemovedEmail(user.email, user.firstName)).catch(log('email'))
    : Promise.resolve()

  return Promise.all([inApp, email])
}

module.exports = { notifyResidencyChange }
