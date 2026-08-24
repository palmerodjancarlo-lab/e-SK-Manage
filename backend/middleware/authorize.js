// middleware/authorize.js
// Role-based access control middleware
// Usage: authorize('admin', 'sk_chairperson')

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
    })
  }
  next()
}

// Shorthand role groups for cleaner route definitions
authorize.ADMIN          = ['admin']
authorize.SK_ALL         = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
authorize.SK_MANAGEMENT  = ['admin','sk_chairperson']
authorize.SK_FINANCE     = ['admin','sk_chairperson','sk_treasurer']
authorize.SK_SECRETARY   = ['admin','sk_chairperson','sk_secretary']
authorize.SK_ATTENDANCE  = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
authorize.ALL_SK_ADMIN   = ['admin','sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

module.exports = authorize