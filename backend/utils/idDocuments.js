// utils/idDocuments.js
// Residency ID / proof documents are personal data, so they are stored as
// *authenticated* Cloudinary assets: the plain delivery URL does not work.
// The server streams the file to permission-checked requests and never hands
// out a reusable link.

const { Readable } = require('stream')
const cloudinary = require('../config/cloudinary')

const ID_FOLDER = 'esk-manage/ids'

// Only formats that are safe to render inline. Anything else is sent as a download.
const INLINE_TYPES = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', pdf: 'application/pdf',
}

// iPhones save photos as HEIC/HEIF, and some browsers send them as octet-stream.
const isHeic = (file) => /image\/hei[cf]/i.test(file.mimetype) || /\.hei[cf]$/i.test(file.originalname || '')

const uploadIdFile = (file, userId) => {
  const mime = isHeic(file) ? 'image/heic' : file.mimetype
  const dataURI = `data:${mime};base64,${Buffer.from(file.buffer).toString('base64')}`
  return cloudinary.uploader.upload(dataURI, {
    folder: ID_FOLDER,
    public_id: `id_${userId}_${Date.now()}`,
    type: 'authenticated',
    resource_type: 'image',              // Cloudinary stores PDFs as image assets too
    ...(isHeic(file) ? { format: 'jpg' } : {}), // convert so every browser can display it
  })
}

const destroyIdAsset = (doc) => cloudinary.uploader
  .destroy(doc.publicId, { type: 'authenticated', resource_type: doc.resourceType || 'image', invalidate: true })
  .catch(() => {})

// Parse a legacy public delivery URL of OUR ids folder into { publicId, format }.
// Returns null for anything else so foreign URLs are never touched.
const parseLegacyUrl = (url = '') => {
  const m = String(url).match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(esk-manage\/ids\/[^/.]+)\.(\w+)$/)
  return m ? { publicId: m[1], format: m[2].toLowerCase() } : null
}

const destroyLegacy = (url) => {
  const parsed = parseLegacyUrl(url)
  if (!parsed) return Promise.resolve()
  return cloudinary.uploader.destroy(parsed.publicId, { type: 'upload', invalidate: true }).catch(() => {})
}

// Short-lived signed download URL — used server-side only, never sent to clients.
const signedSourceUrl = (doc) => cloudinary.utils.private_download_url(doc.publicId, doc.format, {
  type: 'authenticated',
  resource_type: doc.resourceType || 'image',
  expires_at: Math.floor(Date.now() / 1000) + 60,
})

/**
 * Stream the user's ID document to the response.
 * `user` must have been loaded with `.select('+idDocument')`.
 */
const streamIdDocument = async (res, user) => {
  let source, format
  if (user.idDocument?.publicId) {
    source = signedSourceUrl(user.idDocument)
    format = user.idDocument.format
  } else if (user.idPhoto) {
    // Not yet migrated: still a public asset, but proxy it the same way
    source = user.idPhoto
    format = parseLegacyUrl(user.idPhoto)?.format
  } else {
    return res.status(404).json({ message: 'No ID has been submitted yet.' })
  }

  const upstream = await fetch(source)
  if (!upstream.ok || !upstream.body) {
    return res.status(502).json({ message: 'Could not load the ID document. Please try again.' })
  }

  const inlineType = INLINE_TYPES[(format || '').toLowerCase()]
  res.set({
    'Content-Type': inlineType || 'application/octet-stream',
    'Content-Disposition': inlineType ? 'inline' : 'attachment; filename="id-document"',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  Readable.fromWeb(upstream.body).pipe(res)
}

module.exports = {
  ID_FOLDER, isHeic, uploadIdFile, destroyIdAsset, parseLegacyUrl, destroyLegacy, streamIdDocument,
}
