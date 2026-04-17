/**
 * Catalog / checkout: listing must be approved and not explicitly inactive.
 * Missing `isActive` (legacy documents) is treated as active.
 */
export function isProductPubliclyRentable(product) {
  return !!(product?.isApproved && product.isActive !== false);
}
