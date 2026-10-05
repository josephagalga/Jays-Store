import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Printer, ArrowLeft } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import Receipt from '../../components/common/Receipt'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import { fetchOrderReceipt } from '../../services/api'

export default function BuyerOrderReceiptPage() {
  const { id } = useParams()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order-receipt', id],
    queryFn: async () => {
      const res = await fetchOrderReceipt(id)
      return res.data
    },
  })

  if (isLoading) return (
    <MainLayout>
      <div className="flex justify-center py-32"><Spinner /></div>
    </MainLayout>
  )

  if (isError || !data) return (
    <MainLayout>
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <p className="serif text-3xl font-medium text-[var(--ink)] mb-3">Receipt unavailable</p>
        <p className="text-sm text-[var(--muted)] mb-6">We couldn&apos;t load this receipt.</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => refetch()}>Retry</Button>
          <Link to="/orders">
            <Button variant="secondary">My Orders</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-md mx-auto px-6 py-10">
        <Link to={`/orders/${id}/track`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors mb-6">
          <ArrowLeft size={15} /> Back to tracking
        </Link>
        <Receipt receipt={data.receipt} order={data} />
        <div className="flex gap-3 justify-center mt-6 print:hidden">
          <Button onClick={() => window.print()}>
            <Printer size={15} /> Print receipt
          </Button>
        </div>
      </div>
    </MainLayout>
  )
}
