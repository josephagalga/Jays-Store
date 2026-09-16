import api from '../services/api'
import toast from 'react-hot-toast'

const PAYSTACK_INLINE_URL = 'https://js.paystack.co/v1/inline.js'

function loadPaystackInline() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve(window.PaystackPop)
    const script = document.createElement('script')
    script.src = PAYSTACK_INLINE_URL
    script.async = true
    script.onload = () =>
      (window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack failed to load')))
    script.onerror = () => reject(new Error('Could not load Paystack. Check your connection.'))
    document.body.appendChild(script)
  })
}

/**
 * Collect a Paystack payment for an existing (unpaid) order.
 * Opens the Paystack popup (MoMo + Card), verifies server-side,
 * then calls onVerified(). Throws / toasts on failure.
 */
export async function payForOrder({ orderId, email, amount, onVerified }) {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''
  if (!publicKey) {
    toast.error('Paystack is not configured (missing public key). Contact support.')
    throw new Error('Paystack public key missing')
  }

  const initRes = await api.post('/payments/paystack/initialize/', { order_id: orderId })
  const { reference } = initRes.data

  const PaystackPop = await loadPaystackInline()

  return new Promise((resolve) => {
    const handler = PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(parseFloat(amount) * 100), // pesewas
      currency: 'GHS',
      ref: reference,
      metadata: { order_id: orderId },
      callback: async (response) => {
        try {
          await api.post('/payments/paystack/verify/', { reference: response.reference })
          toast.success('Payment confirmed!')
          onVerified?.()
          resolve(true)
        } catch {
          toast.error('Payment received — verification pending. Check My Orders.')
          onVerified?.()
          resolve(false)
        }
      },
      onClose: () => {
        toast('Payment window closed. Complete payment from My Orders when ready.', { icon: 'ℹ️' })
        onVerified?.()
        resolve(false)
      },
    })
    handler.openIframe()
  })
}
