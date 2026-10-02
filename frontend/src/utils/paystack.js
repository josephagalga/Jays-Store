import api from '../services/api'
import toast from 'react-hot-toast'

/**
 * Start a Paystack payment for an existing unpaid order.
 * Redirects the browser to Paystack's hosted checkout (MoMo + Card).
 * After paying, Paystack sends the user back to /orders/:id/track?reference=...
 * where we verify the payment server-side.
 *
 * We use the hosted checkout URL instead of PaystackPop.setup() because:
 *  - inline.js + openIframe() is blocked by some browsers / CSP
 *  - passing `ref` into PaystackPop after a server-side initialize can
 *    collide with Paystack's own generated reference
 */
export async function payForOrder({ orderId }) {
  const initRes = await api.post('/payments/paystack/initialize/', { order_id: orderId })
  const { authorization_url, paid } = initRes.data || {}

  if (paid) {
    toast.success('Order already paid')
    return true
  }

  if (!authorization_url) {
    toast.error('Could not start Paystack payment. Try again.')
    throw new Error('Paystack authorization_url missing')
  }

  window.location.assign(authorization_url)
  return true
}

/**
 * Verify a Paystack reference after the user returns from checkout.
 * Returns { paid: true } on success.
 */
export async function verifyPaystackReference(reference) {
  if (!reference) return { paid: false }
  const res = await api.post('/payments/paystack/verify/', { reference })
  return res.data
}
