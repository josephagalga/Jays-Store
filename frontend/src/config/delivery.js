// Delivery coverage — single source of truth for the towns we serve.
// As the company grows, just add town names here; banners and checkout
// notices pick them up automatically.
export const SUPPORTED_DELIVERY_TOWNS = ['Navrongo']

export function deliveryCoverageText() {
  const towns = SUPPORTED_DELIVERY_TOWNS
  if (towns.length === 1) return `Delivery only within ${towns[0]}`
  if (towns.length === 2) return `Delivery only within ${towns[0]} and ${towns[1]}`
  return `Delivery only within ${towns.slice(0, -1).join(', ')} and ${towns[towns.length - 1]}`
}

export const DELIVERY_COVERAGE_NOTE =
  'Orders outside our delivery towns cannot be fulfilled — please double-check your address before paying.'
