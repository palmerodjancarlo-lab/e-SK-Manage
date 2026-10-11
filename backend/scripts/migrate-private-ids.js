// scripts/migrate-private-ids.js
// One-time migration: residency IDs uploaded before IDs became private are
// public Cloudinary assets. This converts each one to an *authenticated* asset
// (same file, no re-upload) and records it on the user as `idDocument`.
//
//   node scripts/migrate-private-ids.js           # dry run — prints the plan, changes nothing
//   node scripts/migrate-private-ids.js --apply   # performs the migration
//
// Safe to re-run: users already migrated have an empty `idPhoto` and are skipped.

require('dotenv').config()
const mongoose = require('mongoose')
const connectDB = require('../config/db')
const cloudinary = require('../config/cloudinary')
const User = require('../models/User')
const { parseLegacyUrl } = require('../utils/idDocuments')

const APPLY = process.argv.includes('--apply')

const main = async () => {
  await connectDB()
  const users = await User.find({ idPhoto: { $nin: ['', null] } })
    .select('firstName lastName email idPhoto idType idSubmittedAt updatedAt')

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${users.length} user(s) with a public ID photo\n`)
  const summary = { migrated: 0, skipped: 0, failed: 0 }

  for (const u of users) {
    const label = `${u.firstName} ${u.lastName} <${u.email}>`
    const parsed = parseLegacyUrl(u.idPhoto)
    if (!parsed) {
      console.log(`SKIP  ${label} — not an e-SK Manage ID URL: ${u.idPhoto}`)
      summary.skipped++
      continue
    }
    if (!APPLY) {
      console.log(`PLAN  ${label} — make private: ${parsed.publicId}.${parsed.format}`)
      continue
    }
    try {
      const result = await cloudinary.uploader.rename(parsed.publicId, parsed.publicId, {
        type: 'upload', to_type: 'authenticated', resource_type: 'image', invalidate: true,
      })
      await User.updateOne({ _id: u._id }, {
        $set: {
          idDocument: { publicId: result.public_id, resourceType: result.resource_type, format: result.format },
          idSubmittedAt: u.idSubmittedAt || u.updatedAt || new Date(),
          idType: u.idType || 'Not specified',
          idPhoto: '',
        },
      })
      console.log(`DONE  ${label}`)
      summary.migrated++
    } catch (err) {
      console.log(`FAIL  ${label} — ${err.message || err.error?.message || err}`)
      summary.failed++
    }
  }

  console.log(`\n${APPLY ? '' : '(dry run) '}migrated=${summary.migrated} skipped=${summary.skipped} failed=${summary.failed}`)
  if (!APPLY && users.length) console.log('Run again with --apply to perform the migration.')
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1 })
  .finally(() => mongoose.disconnect())
