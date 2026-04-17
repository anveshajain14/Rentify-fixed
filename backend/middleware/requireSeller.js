import { getAuthUser } from '../lib/auth.js';
import { isSellerRole } from '../lib/roles.js';

/**
 * Requires a valid session and role === "seller". Sets req.sellerUser.
 */
export async function requireSeller(req, res, next) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!isSellerRole(user.role)) {
      return res.status(403).json({ message: 'Seller access required' });
    }
    req.sellerUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
