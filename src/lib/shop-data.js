export const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function getVariant(product, variantId) {
  return product.product_variants?.find((variant) => variant.id === variantId)
    ?? product.product_variants?.find((variant) => variant.stock > 0)
    ?? product.product_variants?.[0]
}

export function getProductFromCartRow(row) {
  const variant = Array.isArray(row.product_variants)
    ? row.product_variants[0]
    : row.product_variants
  const product = Array.isArray(variant?.products) ? variant.products[0] : variant?.products

  if (!variant || !product) return null
  return { ...row, variant, product }
}
