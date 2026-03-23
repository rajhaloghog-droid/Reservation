import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from './api'

interface AuthUser {
  id: number
  email: string
  role: 'admin' | 'user'
}

interface UserBooking {
  id: number
  company: string
  phone: string
  address: string
  employee_name?: string
  employee_position?: string
  employee_department_branch?: string
  vehicle_id: number
  date: string
  start_time?: string
  end_time?: string
  note?: string
  status: string
  created_at?: string
  decision_at?: string
}

function buildAttHtml(booking: UserBooking, user: AuthUser) {
  const safe = (value?: string) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const company = safe(booking.company)
  const destination = safe(booking.address || '-')
  const purpose = safe(booking.note || '-')
  const travelDate = safe(booking.date || '-')
  const timeIn = safe(booking.start_time || '-')
  const timeOut = safe(booking.end_time || '-')
  const employeeName = safe(booking.employee_name || user.email || '-')
  const employeePosition = safe(booking.employee_position || '-')
  const employeeDepartmentBranch = safe(booking.employee_department_branch || '-')
  const generatedAt = safe(new Date().toLocaleString())

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Authority To Travel</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 10px; color: #000; }
    .att-sheet { border: 2px solid #111; padding: 10px 14px 14px; }
    .top-meta { display: flex; justify-content: flex-end; font-size: 12px; line-height: 1.1; }
    .title { text-align: center; font-size: 20px; font-weight: 800; letter-spacing: 1px; margin: -18px 0 8px; }
    .head-box { border: 1px solid #111; padding: 6px; margin-bottom: 10px; }
    .head-grid { display: grid; grid-template-columns: 1.4fr 1.2fr 1fr; gap: 6px 16px; font-size: 14px; }
    .field { white-space: nowrap; }
    .line-fill { display: inline-block; min-width: 180px; border-bottom: 1px solid #111; vertical-align: middle; height: 14px; line-height: 14px; }
    .section-title { text-align: center; font-weight: 800; font-size: 18px; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border: 1px solid #111; padding: 4px 6px; vertical-align: middle; }
    th { font-weight: 700; text-align: center; }
    .transport-cell { width: 26%; vertical-align: top; }
    .transport-list { margin: 4px 0 0; padding: 0 0 0 6px; list-style: none; }
    .transport-list li { margin: 2px 0; }
    .box-mark { display: inline-block; width: 12px; height: 12px; border: 1px solid #111; margin-right: 6px; text-align: center; font-size: 10px; line-height: 10px; vertical-align: baseline; }
    .footer-sign { border: 1px solid #111; margin-top: 18px; padding: 42px 8px 2px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .sig { text-align: center; }
    .sig-line { border-top: 1px solid #111; margin-bottom: 2px; }
    .fine { margin-top: 6px; font-size: 11px; text-align: right; }
    @media print { body { margin: 0; } .att-sheet { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="att-sheet">
    <div class="top-meta">
      <div>
        <div>HR Form No. 002</div>
        <div>Original Document</div>
      </div>
    </div>
    <div class="title">AUTHORITY TO TRAVEL</div>

    <div class="head-box">
      <div class="head-grid">
        <div class="field"><strong>Employee Name:</strong> <span class="line-fill">${employeeName}</span></div>
        <div class="field"><strong>Position:</strong> <span class="line-fill">${employeePosition}</span></div>
        <div class="field"></div>
        <div class="field"><strong>Dept./Branch:</strong> <span class="line-fill">${employeeDepartmentBranch}</span></div>
        <div class="field"><strong>Company:</strong> <span class="line-fill">${company}</span></div>
        <div class="field"><strong>Date:</strong> <span class="line-fill">${travelDate}</span></div>
      </div>
    </div>

    <div class="section-title">DETAILS OF TRAVEL</div>
    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width:16%;">Destination</th>
          <th colspan="2" style="width:19%;">Date of Travel</th>
          <th colspan="2" style="width:24%;">Time of Travel</th>
          <th rowspan="2" style="width:23%;">Purpose of Travel</th>
          <th rowspan="2" style="width:18%;">Type of Transportation</th>
        </tr>
        <tr>
          <th>From</th>
          <th>To</th>
          <th>Time-in</th>
          <th>Time-out</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${destination}</td>
          <td>${travelDate}</td>
          <td>${travelDate}</td>
          <td>${timeIn}</td>
          <td>${timeOut}</td>
          <td>${purpose}</td>
          <td class="transport-cell" rowspan="7">
            <ul class="transport-list">
              <li><span class="box-mark">X</span>Company Vehicle</li>
              <li><span class="box-mark"></span>Own Car</li>
              <li><span class="box-mark"></span>Taxi</li>
              <li><span class="box-mark"></span>Bus</li>
              <li><span class="box-mark"></span>Jeepney</li>
              <li><span class="box-mark"></span>Tricycle</li>
              <li><span class="box-mark"></span>Plane/Boat</li>
              <li><span class="box-mark"></span>Others</li>
            </ul>
          </td>
        </tr>
        <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>

    
    <div class="fine">Booking Ref: #${booking.id} | Generated: ${generatedAt}</div>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`
}

export default function UserApprovals({ user, token }: { user: AuthUser; token: string }) {
  const [bookings, setBookings] = useState<UserBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const createdByEmail = String(user.email || '').trim().toLowerCase()
      if (!token) {
        setError('No auth token; please log in again.')
        setLoading(false)
        return
      }
      const res = await fetch(
        `${API_BASE_URL}/api/bookings?created_by_user_id=${encodeURIComponent(
          String(user.id)
        )}&created_by_user_email=${encodeURIComponent(createdByEmail)}`
      , { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok && data.success) {
        setBookings(data.data || [])
      } else {
        setError('Failed to load your bookings')
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [user.email, user.id, token])

  useEffect(() => {
    fetchBookings()
    const onUpdate = () => {
      fetchBookings()
    }
    window.addEventListener('bookingUpdated', onUpdate)
    return () => window.removeEventListener('bookingUpdated', onUpdate)
  }, [fetchBookings])

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort((a, b) => {
        const aTs = a.created_at || ''
        const bTs = b.created_at || ''
        return bTs.localeCompare(aTs)
      }),
    [bookings]
  )

  const handlePrintAtt = (booking: UserBooking) => {
    const printWindow = window.open('', '_blank', 'width=900,height=800')
    if (!printWindow) {
      window.alert('Unable to open print window. Please allow popups and try again.')
      return
    }
    printWindow.document.open()
    printWindow.document.write(buildAttHtml(booking, user))
    printWindow.document.close()
  }

  return (
    <div className="user-approvals-container">
      <h2>My Booking Status</h2>
      <p className="admin-home-subtitle">View approval results and print ATT for approved bookings.</p>

      {loading && <p>Loading your bookings...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && sortedBookings.length === 0 && (
        <p>No booking records found for your account.</p>
      )}

      {!loading && !error && sortedBookings.length > 0 && (
        <div className="admin-home-table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Company</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>ATT</th>
              </tr>
            </thead>
            <tbody>
              {sortedBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>{booking.company || '-'}</td>
                  <td>{booking.date || '-'}</td>
                  <td>
                    {booking.start_time && booking.end_time
                      ? `${booking.start_time} - ${booking.end_time}`
                      : '-'}
                  </td>
                  <td>
                    <span className="status-badge status-pending">{booking.status}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handlePrintAtt(booking)}
                      disabled={booking.status !== 'approved'}
                      style={{ backgroundColor: booking.status === 'approved' ? '#2e7d32' : '#9ca3af' }}
                    >
                      Print ATT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
