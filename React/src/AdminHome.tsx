import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from './api'

interface PendingReservation {
  id: number
  company: string
  phone: string
  address: string
  date: string
  start_time?: string
  end_time?: string
  status: string
}

interface PendingBooking {
  id: number
  company: string
  phone: string
  address: string
  date: string
  start_time?: string
  end_time?: string
  note?: string
  status: string
  decision_at?: string
}

export default function AdminHome({ token }: { token: string }) {
  const HISTORY_PAGE_SIZE = 10
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([])
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([])
  const [approvalHistory, setApprovalHistory] = useState<PendingBooking[]>([])
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all')
  const [historyDateFilter, setHistoryDateFilter] = useState('')
  const [historyCompanyFilter, setHistoryCompanyFilter] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPendingReservations = useCallback(async () => {
    try {
      setError('')
      if (!token) {
        setError('No auth token; please log in again.')
        return
      }
      const res = await fetch(`${API_BASE_URL}/api/reservations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()

      if (res.ok && data.success) {
        const pending = (data.data || []).filter(
          (item: PendingReservation) => item.status === 'pending'
        )
        setPendingReservations(pending)
      } else {
        setError('Failed to load pending requests')
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message)
    }
  }, [token])

  const fetchPendingBookings = useCallback(async () => {
    try {
      if (!token) {
        setError('No auth token; please log in again.')
        setLoading(false)
        return
      }
      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()

      if (res.ok && data.success) {
        const allBookings = data.data || []
        const pending = allBookings.filter(
          (item: PendingBooking) => item.status === 'pending'
        )
        const history = allBookings
          .filter((item: PendingBooking) => item.status === 'approved' || item.status === 'rejected')
          .sort((a: PendingBooking, b: PendingBooking) => {
            const aTs = a.decision_at || ''
            const bTs = b.decision_at || ''
            return bTs.localeCompare(aTs)
          })
        setPendingBookings(pending)
        setApprovalHistory(history)
      } else {
        setError('Failed to load pending bookings')
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchData = useCallback(async () => {
    await Promise.all([fetchPendingReservations(), fetchPendingBookings()])
  }, [fetchPendingReservations, fetchPendingBookings])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBookingDecision = async (bookingId: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await fetchPendingBookings()
        setError('')
        window.dispatchEvent(new Event('bookingUpdated'))
      } else {
        if (action === 'approve' && data?.code === 'DOUBLE_RESERVATION') {
          window.alert('⚠ Double reservation')
        }
        setError(data.message || `Failed to ${action} booking`)
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message)
    }
  }

  const handleDeleteBooking = async (bookingId: number) => {
    const shouldDelete = window.confirm('Are you sure you want to delete this approval history record?')
    if (!shouldDelete) return

    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await fetchPendingBookings()
        setError('')
        window.dispatchEvent(new Event('bookingUpdated'))
      } else {
        setError(data.message || 'Failed to delete booking')
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message)
    }
  }

  const filteredApprovalHistory = useMemo(() => {
    return approvalHistory.filter((booking) => {
      const statusMatch =
        historyStatusFilter === 'all' ? true : booking.status === historyStatusFilter
      const dateMatch = historyDateFilter ? booking.date === historyDateFilter : true
      const companyMatch = historyCompanyFilter
        ? booking.company.toLowerCase().includes(historyCompanyFilter.toLowerCase())
        : true
      return statusMatch && dateMatch && companyMatch
    })
  }, [approvalHistory, historyStatusFilter, historyDateFilter, historyCompanyFilter])

  const totalHistoryPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredApprovalHistory.length / HISTORY_PAGE_SIZE))
  }, [filteredApprovalHistory.length, HISTORY_PAGE_SIZE])

  useEffect(() => {
    setHistoryPage(1)
  }, [historyStatusFilter, historyDateFilter, historyCompanyFilter])

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages)
    }
  }, [historyPage, totalHistoryPages])

  const paginatedApprovalHistory = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE
    return filteredApprovalHistory.slice(start, start + HISTORY_PAGE_SIZE)
  }, [filteredApprovalHistory, historyPage, HISTORY_PAGE_SIZE])

  return (
    <div className="admin-home-container">
      <div className="admin-home-content">
        <h2>Welcome Back Admin</h2>
        <p className="admin-home-subtitle">Pending booking requests</p>

        <div className="admin-home-summary">
          <div className="admin-home-card">
            <span>Pending Reservations</span>
            <strong>{pendingReservations.length}</strong>
          </div>
          <div className="admin-home-card" style={{ marginLeft: 12 }}>
            <span>Pending Booking Approval</span>
            <strong>{pendingBookings.length}</strong>
          </div>
        </div>

        <div className="admin-home-table-wrap">
          {loading && <p>Loading pending requests...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {!loading && !error && pendingReservations.length === 0 && (
            <p>No pending booking requests.</p>
          )}

          {!loading && !error && pendingReservations.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingReservations.map((request) => (
                  <tr key={request.id}>
                    <td>{request.id}</td>
                    <td>{request.company}</td>
                    <td>{request.phone}</td>
                    <td>{request.address}</td>
                    <td>{request.date || '-'}</td>
                    <td>
                      {request.start_time && request.end_time
                        ? `${request.start_time} - ${request.end_time}`
                        : '-'}
                    </td>
                    <td>
                      <span className="status-badge status-pending">{request.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h3 style={{ marginTop: 28 }}>Pending Booking Approval</h3>
        <div className="admin-home-table-wrap">
          {loading && <p>Loading pending bookings...</p>}
          {!loading && !error && pendingBookings.length === 0 && (
            <p>No pending bookings for approval.</p>
          )}

          {!loading && !error && pendingBookings.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.id}</td>
                    <td>{booking.company}</td>
                    <td>{booking.phone}</td>
                    <td>{booking.address}</td>
                    <td>{booking.date || '-'}</td>
                    <td>
                      {booking.start_time && booking.end_time
                        ? `${booking.start_time} - ${booking.end_time}`
                        : '-'}
                    </td>
                    <td>{booking.note?.trim() ? booking.note : '-'}</td>
                    <td>
                      <span className="status-badge status-pending">{booking.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleBookingDecision(booking.id, 'approve')}
                        style={{ backgroundColor: '#2e7d32', marginRight: 8 }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBookingDecision(booking.id, 'reject')}
                        style={{ backgroundColor: '#c62828' }}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h3 style={{ marginTop: 28 }}>Approval History</h3>
        <div className="admin-home-table-wrap">
          {!loading && !error && approvalHistory.length > 0 && (
            <div className="schedule-filters" style={{ marginTop: 6, marginBottom: 16 }}>
              <div className="schedule-filter-field">
                <label htmlFor="history-status-filter">Status</label>
                <select
                  id="history-status-filter"
                  value={historyStatusFilter}
                  onChange={(e) =>
                    setHistoryStatusFilter(e.currentTarget.value as 'all' | 'approved' | 'rejected')
                  }
                >
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="schedule-filter-field">
                <label htmlFor="history-date-filter">Date</label>
                <input
                  id="history-date-filter"
                  type="date"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.currentTarget.value)}
                />
              </div>
              <div className="schedule-filter-field">
                <label htmlFor="history-company-filter">Company</label>
                <input
                  id="history-company-filter"
                  type="text"
                  placeholder="Search company"
                  value={historyCompanyFilter}
                  onChange={(e) => setHistoryCompanyFilter(e.currentTarget.value)}
                />
              </div>
            </div>
          )}

          {!loading && !error && approvalHistory.length === 0 && (
            <p>No approval history yet.</p>
          )}

          {!loading && !error && approvalHistory.length > 0 && filteredApprovalHistory.length === 0 && (
            <p>No history matches the current filters.</p>
          )}

          {!loading && !error && filteredApprovalHistory.length > 0 && (
            <>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApprovalHistory.map((booking) => (
                    <tr key={`history-${booking.id}`}>
                      <td>{booking.id}</td>
                      <td>{booking.company}</td>
                      <td>{booking.phone}</td>
                      <td>{booking.address}</td>
                      <td>{booking.date || '-'}</td>
                      <td>
                        {booking.start_time && booking.end_time
                          ? `${booking.start_time} - ${booking.end_time}`
                          : '-'}
                      </td>
                      <td>{booking.note?.trim() ? booking.note : '-'}</td>
                      <td>
                        <span className="status-badge status-pending">{booking.status}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeleteBooking(booking.id)}
                          style={{ backgroundColor: '#c62828' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalHistoryPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12
                  }}
                >
                  <span>
                    Page {historyPage} of {totalHistoryPages}
                  </span>
                  <div>
                    <button
                      type="button"
                      onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                      disabled={historyPage <= 1}
                      style={{ marginRight: 8 }}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                      disabled={historyPage >= totalHistoryPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
