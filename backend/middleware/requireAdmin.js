import { getAuthUser } from '../lib/auth.js';
import { isAdminRole } from '../lib/roles.js';

/**
 * Requires a valid session and role === "admin". Sets req.adminUser.
 */
export async function requireAdmin(req, res, next) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!isAdminRole(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.adminUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
