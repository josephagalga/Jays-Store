import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/DataTable'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { adminApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminEmailLogsPage() {
  const qc = useQueryClient()
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)

  const { data: logsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-email-logs'],
    queryFn: () => adminApi.getEmailLogs({}),
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const logs = Array.isArray(logsData) ? logsData : logsData?.results || []

  const testEmailMutation = useMutation({
    mutationFn: (to) => adminApi.testEmail(to),
    onSuccess: (res) => {
      if (res?.sent) {
        toast.success('Test email sent successfully!')
      } else {
        toast.error(res?.error ? `Test email failed: ${res.error}` : 'Test email failed to send', { duration: 8000 })
      }
      qc.invalidateQueries(['admin-email-logs'])
    },
    onError: (err) => toast.error(
      err.response?.data?.error || 'Test email request failed (server unreachable?)',
      { duration: 8000 }),
  })

  const sendTestEmail = () => {
    if (!testEmail.trim()) return toast.error('Enter an email address')
    setTestSending(true)
    testEmailMutation.mutate(testEmail.trim(), {
      onSettled: () => setTestSending(false),
    })
  }

  if (isLoading) return (
    <>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </>
  )

  if (isError) return (
    <>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="text-center py-20">
          <p className="text-red-600 text-sm">Failed to load email logs</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[var(--ink)] text-white text-sm rounded-xl">Retry</button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Email Logs</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Monitor email delivery. Failures are highlighted for investigation.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to test"
              className="px-4 py-2 min-h-[48px] text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
            />
            <button
              onClick={sendTestEmail}
              disabled={testSending}
              className="flex items-center gap-2 px-4 py-2 min-h-[48px] bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={testSending ? 'animate-spin' : ''}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {testSending ? 'Sending…' : 'Send Test'}
            </button>
          </div>
        </div>

        <DataTable
          columns={[
            { key: 'created_at', label: 'Sent At', width: '160px', render: (v) => v ? new Date(v).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
            { key: 'kind', label: 'Type', width: '160px', render: (v) => <span className="px-2 py-0.5 bg-[var(--off)] text-[var(--muted)] text-xs font-medium rounded-full capitalize">{(v || 'email').replace('_', ' ')}</span> },
            { key: 'to_email', label: 'Recipient', width: '200px', render: (v) => <p className="text-sm font-medium text-[var(--ink)]">{v}</p> },
            { key: 'subject', label: 'Subject', width: '250px', render: (v) => <p className="text-sm font-medium text-[var(--ink)] line-clamp-1 max-w-[220px]">{v || '—'}</p> },
            { key: 'ok', label: 'Status', width: '100px', render: (v) => v ? (
              <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-green-50 text-green-700"><CheckCircle size={10} className="inline-block mr-1" /> Sent</span>
            ) : (
              <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-rose-50 text-rose-600"><AlertCircle size={10} className="inline-block mr-1" /> Failed</span>
            ) },
            { key: 'error', label: 'Error', width: '250px', render: (v, row) => row.ok ? '-' : <p className="text-xs text-rose-600 line-clamp-1 max-w-[200px]">{v || 'Unknown error'}</p> },
          ]}
          data={logs || []}
          keyField="id"
          emptyMessage="No email logs yet"
        />
      </div>
    </>
  )
}
