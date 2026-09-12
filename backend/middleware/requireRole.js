/**
 * Middleware factory to enforce Role-Based Access Control (RBAC).
 * Expects `req.user` to be populated by the `protect` middleware.
 * 
 * @param  {...string} allowedRoles - Roles permitted to access the route (e.g., 'authority', 'admin')
 * @returns {import('express').RequestHandler}
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Not authenticated or user role missing' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles`
      });
    }

    next();
  };
};

export default requireRole;
