import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from './api'

interface Vehicle {
  id: number
  vehicle_type: string
  quantity: number
}

interface BookingData {
  id: number
  vehicle_id: number
  date: string
  booking_time: string
  start_time?: string
  end_time?: string
  status: string
  company?: string
}

interface ReservationData {
  id: number
  vehicle_id: number
  date: string
}

async function parseJsonSafe(res: Response) {
  const raw = await res.text()
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`Invalid JSON response from server (HTTP ${res.status})`)
  }
}

export default function TimeTable({ refreshTrigger, token }: { refreshTrigger?: number; token: string }) {
  const [activeTab, setActiveTab] = useState('today')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [reservations, setReservations] = useState<ReservationData[]>([])
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all')

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30'
  ]

  const timeLabels: { [key: string]: string } = {
    '08:00': '8:00 AM', '08:30': '8:30 AM', '09:00': '9:00 AM', '09:30': '9:30 AM',
    '10:00': '10:00 AM', '10:30': '10:30 AM', '11:00': '11:00 AM', '11:30': '11:30 AM',
    '12:00': '12:00 PM', '12:30': '12:30 PM', '13:00': '1:00 PM', '13:30': '1:30 PM',
    '14:00': '2:00 PM', '14:30': '2:30 PM', '15:00': '3:00 PM', '15:30': '3:30 PM'
  }

  const getWeekDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const day = days[date.getDay()]
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const dayNum = String(date.getDate()).padStart(2, '0')
    return `${day} ${month}/${dayNum}`
  }

  const fetchVehicles = useCallback(async () => {
    try {
      if (!token) return
      const res = await fetch(`${API_BASE_URL}/api/vehicles`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) {
        throw new Error(`Failed to fetch vehicles (HTTP ${res.status})`)
      }
      if (data?.success) {
        setVehicles(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err)
    }
  }, [token])

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      if (!token) {
        setLoading(false)
        return
      }
      const res = await fetch(`${API_BASE_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) {
        throw new Error(`Failed to fetch bookings (HTTP ${res.status})`)
      }
      if (data?.success) {
        setBookings(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const getBookingStatus = (vehicleId: number, timeSlot: string) => {
    const timeToSlot = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number)
      return Math.floor(((hours * 60 + minutes) - (8 * 60)) / 30)
    }
    const targetSlot = timeToSlot(timeSlot)

    const booking = bookings.find((b) => {
      if (b.vehicle_id !== vehicleId || b.date !== selectedDate) return false
      if (b.status !== 'approved' && b.status !== 'booked') return false
      const start = b.start_time || b.booking_time
      const startSlot = timeToSlot(start)
      const endSlot = b.end_time ? timeToSlot(b.end_time) : startSlot
      if (endSlot < startSlot) return false
      return targetSlot >= startSlot && targetSlot <= endSlot
    })

    return booking ? 'reserved' : 'available'
  }

  const fetchReservations = useCallback(async () => {
    try {
      if (!token) return
      const res = await fetch(`${API_BASE_URL}/api/reservations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await parseJsonSafe(res)
      if (!res.ok) {
        throw new Error(`Failed to fetch reservations (HTTP ${res.status})`)
      }
      if (data?.success) {
        setReservations(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching reservations:', err)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    fetchVehicles()
    fetchReservations()
    fetchBookings()
    
    // Refresh bookings every 5 seconds to show live updates
    const interval = setInterval(fetchBookings, 5000)
    return () => clearInterval(interval)
  }, [token, refreshTrigger, fetchVehicles, fetchReservations, fetchBookings])

  useEffect(() => {
    const baseDate = new Date()
    if (activeTab === 'tomorrow') {
      baseDate.setDate(baseDate.getDate() + 1)
    }
    setSelectedDate(baseDate.toISOString().split('T')[0])
    
    // Refresh bookings when tab changes
    if (token) fetchBookings()
  }, [activeTab, token, fetchBookings])

  const handleCellClick = (vehicleId: number, timeSlot: string) => {
    const status = getBookingStatus(vehicleId, timeSlot)
    if (status === 'available') {
      alert('To book this time slot, please use the "Make Booking" tab to fill in your details.')
    }
  }

  const allowedVehicleIds = new Set(
    reservations
      .filter((reservation) => {
        if (activeTab === 'week') {
          const weekDates = getWeekDates()
          return weekDates.includes(reservation.date) && Number.isFinite(reservation.vehicle_id)
        }
        return reservation.date === selectedDate && Number.isFinite(reservation.vehicle_id)
      })
      .map((reservation) => reservation.vehicle_id)
  )

  const filteredVehicles = vehicles.filter((vehicle) => {
    if (!allowedVehicleIds.has(vehicle.id)) {
      return false
    }
    // For week view, always show all vehicles (ignore car filter)
    if (activeTab === 'week') {
      return true
    }
    // For today/tomorrow, apply car filter
    if (selectedVehicleId === 'all') {
      return true
    }
    return vehicle.id === parseInt(selectedVehicleId)
  })

  return (
    <div className="time-table-container">
      <h2>Booking Schedule</h2>
      
      {activeTab !== 'week' && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e8f4f0', borderRadius: '4px' }}>
          <strong>Date:</strong> {getDayLabel(selectedDate)} | <strong>View:</strong> {activeTab === 'today' ? 'Today' : 'Tomorrow'}
        </div>
      )}
      
      <div className="time-table-header">
        <button
          className={`time-table-tab ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Today
        </button>
        <button
          className={`time-table-tab ${activeTab === 'tomorrow' ? 'active' : ''}`}
          onClick={() => setActiveTab('tomorrow')}
        >
          Tomorrow
        </button>
        <button
          className={`time-table-tab ${activeTab === 'week' ? 'active' : ''}`}
          onClick={() => setActiveTab('week')}
        >
          This Week
        </button>
      </div>

      <div className="schedule-filters">
        {activeTab !== 'week' && (
          <div className="schedule-filter-field">
            <label htmlFor="schedule-date">Date</label>
            <input
              id="schedule-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.currentTarget.value)}
              autoComplete="off"
            />
          </div>
        )}
        <div className="schedule-filter-field">
          <label htmlFor="schedule-car">
            Car {activeTab !== 'week' && selectedVehicleId !== 'all' && '(Filtered)'}
          </label>
          <select
            id="schedule-car"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.currentTarget.value)}
            autoComplete="off"
          >
            <option value="all">All Cars</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicle_type}
              </option>
            ))}
          </select>
          {activeTab === 'week' && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
              Note: Showing all cars for the week
            </div>
          )}
        </div>
      </div>

      {loading && <p>Loading bookings...</p>}

      {activeTab === 'week' ? (
        <div className="booking-table-wrapper">
          {getWeekDates().map((date) => {
            const vehiclesForDate = filteredVehicles.filter((vehicle) => 
              reservations.some((r) => r.date === date && r.vehicle_id === vehicle.id)
            )
            
            if (vehiclesForDate.length === 0) return null
            
            return (
              <div key={date} style={{ marginBottom: '30px', width: 'max-content', minWidth: '100%' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #5DA87A 0%, #4a9368 100%)',
                  color: 'white',
                  padding: '12px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '0',
                  borderRadius: '4px 4px 0 0',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {getDayLabel(date)}
                </div>
                
                <table className="booking-table" style={{ marginTop: '0', borderRadius: '0 0 4px 4px' }}>
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Time</th>
                      {timeSlots.map((time) => (
                        <th key={time}>{timeLabels[time]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vehiclesForDate.map((vehicle) => (
                      <tr key={`${date}-${vehicle.id}`}>
                        <td style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0', minWidth: '100px' }}>
                          {vehicle.vehicle_type}
                        </td>
                        <td style={{ backgroundColor: '#f0f0f0', minWidth: '80px', fontSize: '12px', color: '#666' }}>
                          All Day
                        </td>
                        {timeSlots.map((timeSlot) => {
                          const timeToSlot = (time: string) => {
                            const [hours, minutes] = time.split(':').map(Number)
                            return Math.floor(((hours * 60 + minutes) - (8 * 60)) / 30)
                          }
                          const targetSlot = timeToSlot(timeSlot)
                          const isBooked = bookings.some((b) => {
                            if (b.vehicle_id !== vehicle.id || b.date !== date) return false
                            if (b.status !== 'approved' && b.status !== 'booked') return false
                            const start = b.start_time || b.booking_time
                            const startSlot = timeToSlot(start)
                            const endSlot = b.end_time ? timeToSlot(b.end_time) : startSlot
                            if (endSlot < startSlot) return false
                            return targetSlot >= startSlot && targetSlot <= endSlot
                          })

                          return (
                            <td
                              key={`${date}-${vehicle.id}-${timeSlot}`}
                              style={{
                                padding: '8px',
                                textAlign: 'center',
                                backgroundColor: isBooked ? '#ff6b6b' : '#3498db',
                                cursor: 'pointer',
                                height: '40px',
                                minWidth: '50px'
                              }}
                              title={isBooked ? 'Reserved' : 'Available'}
                            />
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="booking-table-wrapper">
          <table className="booking-table">
            <thead>
              <tr>
                <th>Vehicle Type</th>
                <th>Quantity</th>
                {timeSlots.map((time) => (
                  <th key={time}>{timeLabels[time]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="vehicle-col">{vehicle.vehicle_type}</td>
                  <td className="vehicle-col">{vehicle.quantity}</td>
                  {timeSlots.map((timeSlot) => {
                    const status = getBookingStatus(vehicle.id, timeSlot)
                    return (
                      <td
                        key={`${vehicle.id}-${timeSlot}`}
                        className={`booking-cell ${status}`}
                        style={{ backgroundColor: status === 'reserved' ? '#ff6b6b' : '#3498db', height: '40px', minWidth: '60px' }}
                        onClick={() => handleCellClick(vehicle.id, timeSlot)}
                        title={status === 'available' ? 'Click to make booking' : 'Already booked'}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredVehicles.length === 0 && !loading && (
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#666', fontSize: '16px' }}>
          No schedule entries for this date yet. Add a car and date in Add Entry first.
        </p>
      )}

      <div className="booking-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#3498db' }}></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ff6b6b' }}></div>
          <span>Reserved</span>
        </div>
        {activeTab === 'week' && (
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#e0e0e0' }}></div>
            <span>No Entry Added</span>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        Schedule updates automatically every 5 seconds
      </div>
    </div>
  )
}
