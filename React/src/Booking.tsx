  import { useState, useEffect, useCallback } from 'react'
  import { API_BASE_URL } from './api'

  interface ReservationEntry {
    id: number
    company: string
    phone: string
    address: string
    vehicle_id: number
    vehicle_type: string
    quantity_available: number
    date: string
    start_time: string
    end_time: string
    note: string
    status: string
    created_at: string
  }

  interface Company {
    id: number
    name: string
    email?: string
    phone?: string
    address?: string
  }

  interface Employee {
    id: number
    name: string
    position: string
    department_branch: string
  }

  interface Vehicle {
    id: number
    vehicle_type: string
    car_model?: string
  }

  interface BookingUser {
    id: number
    email: string
    role: 'admin' | 'user'
  }

  export default function Booking({
    token,
    currentUser,
    onBookingSuccess
  }: {
    token: string
    currentUser: BookingUser
    onBookingSuccess?: () => void
  }) {
    const [companies, setCompanies] = useState<Company[]>([])
    const [employees, setEmployees] = useState<Employee[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [formData, setFormData] = useState({
      company: '',
      employee_name: '',
      employee_position: '',
      employee_department_branch: '',
      phone: '',
      address: '',
      date: '',
      start_time: '',
      end_time: '',
      vehicle_id: '',
      note: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

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

    const getAvailableEndTimes = () => {
      if (!formData.start_time) return timeSlots
      const startIndex = timeSlots.indexOf(formData.start_time)
      return timeSlots.slice(startIndex + 1)
    }

  const getAvailableStartTimes = () => {
    if (!formData.end_time) return timeSlots
    const endIndex = timeSlots.indexOf(formData.end_time)
    return timeSlots.slice(0, endIndex)
  }

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const list = data.data || []
        setCompanies(list)
        localStorage.setItem('companies-cache', JSON.stringify({ updatedAt: Date.now(), list }))
      }
    } catch (err) {
      console.error('Error fetching companies:', err)
    }
  }, [token])

    const fetchVehicles = useCallback(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/vehicles`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) {
          setVehicles(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching vehicles:', err)
      }
    }, [token])

    const fetchEmployees = useCallback(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/employees`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setEmployees(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching employees:', err)
      }
    }, [token])

  const fetchReservations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        const filteredReservations = data.data?.filter((r: ReservationEntry) => r.status === 'pending') || []
        const fallbackCompanies = [...new Set(filteredReservations.map((r: ReservationEntry) => r.company))]
          .filter((name): name is string => Boolean(name))
          .map((name, idx) => ({ id: -(idx + 1), name, phone: '', address: '' }))

        setCompanies(prev => (prev.length > 0 ? prev : fallbackCompanies))
      }
    } catch (err) {
      console.error('Error fetching reservations:', err)
    }
  }, [token])

    useEffect(() => {
      if (!token) return

      // Seed companies from cache if available
      try {
        const cached = localStorage.getItem('companies-cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed.list)) {
            setCompanies(parsed.list)
          }
        }
      } catch {
        // Ignore malformed local cache and fetch a fresh list instead.
      }

      fetchCompanies()
      fetchReservations()
      fetchVehicles()
      fetchEmployees()

      const refreshCompanies = () => fetchCompanies()
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'companies-cache' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue)
            if (Array.isArray(parsed.list)) {
              setCompanies(parsed.list)
            }
          } catch {
            // Ignore malformed storage updates from other tabs.
          }
        }
      }
      window.addEventListener('companiesUpdated', refreshCompanies)
      window.addEventListener('storage', onStorage)
      return () => {
        window.removeEventListener('companiesUpdated', refreshCompanies)
        window.removeEventListener('storage', onStorage)
      }
    }, [token, fetchCompanies, fetchReservations, fetchVehicles, fetchEmployees])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.currentTarget
      if (name === 'company') {
        const selectedCompany = companies.find((company) => company.name === value)
        setFormData(prev => ({
          ...prev,
          company: value,
          phone: selectedCompany?.phone || prev.phone,
          address: selectedCompany?.address || prev.address
        }))
        return
      }

      if (name === 'employee_name') {
        const selectedEmployee = employees.find((employee) => employee.name === value)
        setFormData(prev => ({
          ...prev,
          employee_name: value,
          employee_position: selectedEmployee?.position || '',
          employee_department_branch: selectedEmployee?.department_branch || ''
        }))
        return
      }

      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      if (
        !formData.company ||
        !formData.employee_name ||
        !formData.employee_position ||
        !formData.employee_department_branch ||
        !formData.phone ||
        !formData.address ||
        !formData.date ||
        !formData.start_time ||
        !formData.end_time ||
        !formData.vehicle_id
      ) {
        setError('Please fill in all required fields')
        return
      }

      setLoading(true)
      setError('')
      setSuccess('')

      try {
        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            company: formData.company,
            employee_name: formData.employee_name,
            employee_position: formData.employee_position,
            employee_department_branch: formData.employee_department_branch,
            phone: formData.phone,
            address: formData.address,
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            note: formData.note,
            vehicle_id: parseInt(formData.vehicle_id),
            created_by_user_id: currentUser.id,
            created_by_user_email: currentUser.email
          }),
        })

        const data = await response.json()
        if (response.ok && data.success) {
          setSuccess('Booking submitted. Waiting for admin approval.')
          setFormData({
            company: '',
            employee_name: '',
            employee_position: '',
            employee_department_branch: '',
            phone: '',
            address: '',
            date: '',
            start_time: '',
            end_time: '',
            vehicle_id: '',
            note: ''
          })
          // Trigger schedule refresh if callback provided
          if (onBookingSuccess) {
            setTimeout(onBookingSuccess, 500)
          }
          // Refresh the reservations list to show updated availability
          setTimeout(() => {
            fetchCompanies()
            fetchReservations()
            window.dispatchEvent(new Event('bookingUpdated'))
          }, 500)
        } else {
          const errorMessage = data.error || data.message || 'Failed to book'
          const isDoubleReservation =
            data?.code === 'DOUBLE_RESERVATION' ||
            (typeof errorMessage === 'string' && (
              errorMessage.toLowerCase().includes('double reservation') ||
              errorMessage.toLowerCase().includes('already booked') ||
              errorMessage.toLowerCase().includes('requested/booked')
            ))
          const isNotScheduledByAdmin =
            (typeof errorMessage === 'string' && (
              errorMessage.toLowerCase().includes('no entry available') ||
              errorMessage.toLowerCase().includes('add entry first') ||
              errorMessage.toLowerCase().includes('not scheduled')
            ))

          if (isDoubleReservation) {
            setError('')
            window.alert('⚠ Double reservation: this time range is already booked.')
          } else if (isNotScheduledByAdmin) {
            setError('')
            window.alert('⚠ This date/vehicle is not scheduled by admin yet.')
          } else {
            setError(errorMessage)
          }
        }
      } catch (err) {
        setError('Network error: ' + (err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="booking-container">
        <h2>Make a Booking</h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="booking-company" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Company:
            </label>
            <select
              id="booking-company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              autoComplete="organization"
              required
              style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            >
              <option value="">-- Select a company --</option>
              {companies.map(company => (
                <option key={company.id} value={company.name}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="booking-employee" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Employee:
            </label>
            <select
              id="booking-employee"
              name="employee_name"
              value={formData.employee_name}
              onChange={handleChange}
              autoComplete="name"
              required
              style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            >
              <option value="">-- Select an employee --</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.name}>
                  {employee.name} - {employee.position}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="booking-phone" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Phone Number:
            </label>
            <input
              id="booking-phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              autoComplete="tel"
              required
              style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="booking-address" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Address:
            </label>
            <input
              id="booking-address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address"
              autoComplete="street-address"
              required
              style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="booking-date" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Date:
            </label>
            <input
              id="booking-date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              autoComplete="off"
              required
              style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            />
          </div>

          <div>
            <label htmlFor="booking-vehicle" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Vehicle:
            </label>
            <select
              id="booking-vehicle"
              name="vehicle_id"
              value={formData.vehicle_id}
              onChange={handleChange}
              autoComplete="off"
              required
              style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            >
              <option value="">-- Select a vehicle --</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_type} {vehicle.car_model ? `(${vehicle.car_model})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label htmlFor="booking-start-time" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                From:
              </label>
              <select
                id="booking-start-time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                autoComplete="off"
                required
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
              >
                <option value="">-- Select start time --</option>
                {getAvailableStartTimes().map(time => (
                  <option key={time} value={time}>
                    {timeLabels[time]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="booking-end-time" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                To:
              </label>
              <select
                id="booking-end-time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                autoComplete="off"
                required
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
              >
                <option value="">-- Select end time --</option>
                {getAvailableEndTimes().map(time => (
                  <option key={time} value={time}>
                    {timeLabels[time]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="booking-note" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Notes:
            </label>
            <textarea
              id="booking-note"
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Optional note for admin"
              rows={3}
              style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: '20px' }}>
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </form>

        {formData.company && formData.employee_name && formData.phone && formData.address && formData.date && formData.start_time && formData.end_time && formData.vehicle_id && (
          <div style={{ backgroundColor: '#ecf0f1', padding: '15px', borderRadius: '5px', marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Booking Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <strong>Company:</strong>
                <p>{formData.company}</p>
              </div>
              <div>
                <strong>Employee:</strong>
                <p>{formData.employee_name}</p>
              </div>
              <div>
                <strong>Position:</strong>
                <p>{formData.employee_position || '-'}</p>
              </div>
              <div>
                <strong>Dept./Branch:</strong>
                <p>{formData.employee_department_branch || '-'}</p>
              </div>
              <div>
                <strong>Phone Number:</strong>
                <p>{formData.phone}</p>
              </div>
              <div>
                <strong>Address:</strong>
                <p>{formData.address}</p>
              </div>
              <div>
                <strong>Vehicle:</strong>
                <p>{vehicles.find(v => v.id.toString() === formData.vehicle_id)?.vehicle_type} {vehicles.find(v => v.id.toString() === formData.vehicle_id)?.car_model && `(${vehicles.find(v => v.id.toString() === formData.vehicle_id)?.car_model})`}</p>
              </div>
              <div>
                <strong>Date:</strong>
                <p>{formData.date}</p>
              </div>
              <div>
                <strong>Time Slot:</strong>
                <p>{formData.start_time} - {formData.end_time}</p>
              </div>
              <div>
                <strong>Notes:</strong>
                <p>{formData.note || '-'}</p>
              </div>
            </div>
          </div>
        )}

        {error && <p style={{ color: 'red', marginTop: '15px', padding: '10px', backgroundColor: '#fadbd8', borderRadius: '5px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginTop: '15px', padding: '10px', backgroundColor: '#d5f4e6', borderRadius: '5px' }}>{success}</p>}
        
      </div>
    )
  }
