// Single source of truth for delivery fees (GHS), mirroring the backend
// `calculate_delivery_fee()` in backend/apps/orders/models.py:
//   1-5 items  -> GHS 5
//   6-10 items -> GHS 10
//   11+ items  -> GHS 20
// The server recalculates this on order placement, so these helpers are
// for display only — never trust client-side totals.

export function deliveryFeeForCount(itemCount) {
  const n = Number(itemCount) || 0
  if (n <= 0) return 0
  if (n <= 5) return 5
  if (n <= 10) return 10
  return 20
}

export function cartItemCount(items) {
  return (items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
}

export function cartSubtotal(items) {
  return (items || []).reduce(
    (sum, i) => sum + parseFloat(i.unit_price || 0) * (Number(i.quantity) || 0),
    0
  )
}
