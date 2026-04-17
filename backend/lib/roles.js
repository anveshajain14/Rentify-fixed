export function isAdminRole(role) {
  return role === 'admin';
}

export function isSellerRole(role) {
  return role === 'seller';
}

export function isUserRole(role) {
  return role === 'user' || role === 'renter';
}

/** Non-admin accounts that can place rentals / order requests (not admins). */
export function canPlaceOrders(role) {
  return role === 'user' || role === 'renter' || role === 'seller';
}
