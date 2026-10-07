// middleware/authorize.js
// Role-based access control. Chairperson = head (inherits old admin powers).

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated.' })
  // 'admin' and 'sk_chairperson' are interchangeable heads
  const role = req.user.role
  const ok = roles.includes(role) ||
    ((role === 'admin' || role === 'sk_chairperson') &&
     (roles.includes('admin') || roles.includes('sk_chairperson')))
  if (!ok) {
    return res.status(403).json({
      message: `Access denied. Required: ${roles.join(' or ')}. Your role: ${role}`
    })
  }
  next()
}

// Role groups — chairperson included everywhere admin used to be
authorize.HEAD          = ['sk_chairperson','admin']              // top authority
authorize.ADMIN         = ['sk_chairperson','admin']              // legacy alias
authorize.SK_ALL        = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad','admin']
authorize.SK_MANAGEMENT = ['sk_chairperson','admin']
authorize.SK_FINANCE    = ['sk_chairperson','sk_treasurer','admin']
authorize.SK_SECRETARY  = ['sk_chairperson','sk_secretary','admin']
authorize.SK_ATTENDANCE = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad','admin']
authorize.ALL_SK        = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad','admin']

module.exports = authorize