export function isUserRole(role) {
  return role === 'user' || role === 'renter';
}

export function isSellerRole(role) {
  return role === 'seller';
}

export function isAdminRole(role) {
  return role === 'admin';
}

/** Discover / renting: users and sellers (not admins). */
export function canBrowseMarketplace(role) {
  return role === 'user' || role === 'renter' || role === 'seller';
}
