/**
 * Shop receipt — narrow, thermal-printer friendly, black on white.
 * Rendered inside #print-receipt so @media print outputs only this.
 */
export default function Receipt({ receipt, order }) {
  if (!receipt) return null
  const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-GH', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—')
  const money = (v) => `GHS ${parseFloat(v || 0).toFixed(2)}`
  const showOtp = !!order?.delivery_otp && ['pending', 'accepted', 'picked_up'].includes(order?.status)

  return (
    <div id="print-receipt" className="receipt">
      <div className="receipt-center receipt-store">JAY'S STORE</div>
      <div className="receipt-center">Navrongo, Ghana · 0535668728</div>
      <div className="receipt-center">myjaysstore@gmail.com</div>
      <div className="receipt-divider" />
      <div className="receipt-row"><span>Receipt #</span><span>{receipt.order_id}</span></div>
      <div className="receipt-row"><span>Date</span><span>{fmtDate(receipt.paid_at || order?.created_at)}</span></div>
      <div className="receipt-row"><span>Buyer</span><span>{receipt.buyer_name}</span></div>
      <div className="receipt-row"><span>Payment</span><span>{String(receipt.payment_method).replace(/_/g, ' ')} · {receipt.payment_status}</span></div>
      {receipt.paystack_reference && (
        <div className="receipt-row"><span>Reference</span><span className="receipt-ref">{receipt.paystack_reference}</span></div>
      )}
      <div className="receipt-divider" />
      {(receipt.items || []).map((item, i) => (
        <div key={i} className="receipt-item">
          <div className="receipt-row"><span>{item.name}</span><span>{money(item.total)}</span></div>
          <div className="receipt-dim">{item.size} · {item.color} · x{item.quantity} @ {money(item.unit_price)}</div>
        </div>
      ))}
      <div className="receipt-divider" />
      <div className="receipt-row"><span>Subtotal</span><span>{money(receipt.subtotal)}</span></div>
      <div className="receipt-row"><span>Delivery fee</span><span>{money(receipt.delivery_fee)}</span></div>
      {parseFloat(receipt.processing_fee || 0) > 0 && (
        <div className="receipt-row"><span>Processing fee</span><span>{money(receipt.processing_fee)}</span></div>
      )}
      <div className="receipt-row receipt-total"><span>TOTAL CHARGED</span><span>{money(receipt.charged_total || receipt.total)}</span></div>
      <div className="receipt-divider" />
      <div className="receipt-dim">Deliver to: {receipt.delivery_address}</div>
      {receipt.delivery_landmark && <div className="receipt-dim">Landmark: {receipt.delivery_landmark}</div>}
      {showOtp && (
        <>
          <div className="receipt-divider" />
          <div className="receipt-center">DELIVERY OTP</div>
          <div className="receipt-center receipt-otp">{order.delivery_otp}</div>
          <div className="receipt-center receipt-dim">Give this code to your driver</div>
        </>
      )}
      <div className="receipt-divider" />
      <div className="receipt-center">Thank you for shopping with us!</div>
      <div className="receipt-center receipt-dim">Track: /orders/{receipt.order_id}/track</div>
    </div>
  )
}
