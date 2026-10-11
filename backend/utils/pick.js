// utils/pick.js
// Copy only the listed fields that the client actually sent. Used on create/update
// so a request can't set server-managed fields (owner, audit history, QR tokens…).
const pick = (body = {}, fields = []) => {
  const out = {}
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = body[f]
  }
  return out
}

module.exports = pick
