import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL } from './api'

interface Vehicle {
  id: number
  vehicle_type: string
  car_model?: string
}

export default function ReservationForm({ token }: { token: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [formData, setFormData] = useState({
    date: '',
    vehicle_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchVehicles = useCallback(async () => {
    try {
      if (!token) {
        setError('No auth token; please log in again.')
        return
      }
      const res = await fetch(`${API_BASE_URL}/api/vehicles`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setVehicles(data.data || [])
        setError('')
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err)
      setError('Network error: ' + (err as Error).message)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchVehicles()
  }, [token, fetchVehicles])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.currentTarget
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!token) {
        setError('No auth token; please log in again.')
        setLoading(false)
        return
      }
      const response = await fetch(`${API_BASE_URL}/api/reservations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: formData.date,
          vehicle_id: parseInt(formData.vehicle_id),
          company: 'Admin',
          phone: 'N/A',
          address: 'N/A',
          note: '',
          status: 'admin-created'
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setSuccess('✓ Reservation slot created successfully!')
        setFormData({
          date: '',
          vehicle_id: ''
        })
      } else {
        setError(data.error || 'Failed to add reservation')
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reservation-form-container">
      <h2>Add New Reservation Entry</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="reservation-date">Select Date:</label>
          <input
            id="reservation-date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label htmlFor="reservation-vehicle">Select a Car:</label>
          <select
            id="reservation-vehicle"
            name="vehicle_id"
            value={formData.vehicle_id}
            onChange={handleChange}
            required
          >
            <option value="">-- Select a vehicle --</option>
            {vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicle_type} {vehicle.car_model ? `(${vehicle.car_model})` : ''}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Create Reservation Slot'}
        </button>
      </form>
        

        
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  )
}
