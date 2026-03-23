import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL } from './api'
import { resizeImageFile } from './imageUpload'

interface Vehicle {
  id: number
  vehicle_type: string
  quantity?: number
  car_model?: string
  photo?: string | null
}

export default function VehicleManagement({ token }: { token: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [formData, setFormData] = useState({
    vehicle_type: '',
    quantity: '',
    photo: ''
  })
  const [photoPreview, setPhotoPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, files } = e.currentTarget
    
    if (type === 'file' && files) {
      const file = files[0]
      if (file) {
        resizeImageFile(file)
          .then((imageData) => {
            setFormData(prev => ({
              ...prev,
              photo: imageData
            }))
            setPhotoPreview(imageData)
          })
          .catch((error) => {
            setError(error instanceof Error ? error.message : 'Failed to prepare image')
          })
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!token) {
      setError('No auth token; please log in again.')
      setLoading(false)
      return
    }

    try {
      const url = editingId ? `/api/vehicles/${editingId}` : '/api/vehicles'
      
      const res = await fetch(`${API_BASE_URL}${url}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicle_type: formData.vehicle_type,
          quantity: parseInt(formData.quantity) || 0,
          photo: formData.photo || photoPreview || null,
        }),
      })

      const data = await res.json()
      
      if (res.ok && data.success) {
        const successMsg = editingId ? '✓ Vehicle updated successfully!' : '✓ Vehicle type added successfully!'
        setSuccess(successMsg)
        setFormData({ vehicle_type: '', quantity: '', photo: '' })
        setPhotoPreview('')
        setEditingId(null)
        
        // Wait a moment then close modal
        setTimeout(() => {
          setIsModalOpen(false)
          setSuccess('')
        }, 1500)
        
        fetchVehicles()
      } else {
        setError(data.error || 'Failed to save vehicle')
      }
    } catch (err) {
      const errorMsg = 'Network error: ' + (err as Error).message
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (vehicle: Vehicle) => {
    setEditingId(vehicle.id)
    setFormData({
      vehicle_type: vehicle.vehicle_type,
      quantity: vehicle.quantity != null ? vehicle.quantity.toString() : '',
      photo: vehicle.photo || ''
    })
    setPhotoPreview(vehicle.photo || '')
    setIsModalOpen(true)
  }

  const handleAddClick = () => {
    setEditingId(null)
    setFormData({ vehicle_type: '', quantity: '', photo: '' })
    setPhotoPreview('')
    setIsModalOpen(true)
  }

  const handleDelete = async (vehicleId: number) => {
    if (!window.confirm('Are you sure?')) return

    try {
      const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess('Vehicle deleted!')
        fetchVehicles()
      } else {
        setError('Failed to delete vehicle')
      }
    } catch {
      // Keep the existing user-facing error for network failures.
      setError('Network error')
    }
  }

  const handleInlinePhotoUpload = async (vehicle: Vehicle, file: File) => {
    try {
      const photo = await resizeImageFile(file)
      const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicle_type: vehicle.vehicle_type,
          quantity: vehicle.quantity ?? 0,
          car_model: vehicle.car_model || '',
          photo,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to upload vehicle photo')
      }

      setVehicles((currentVehicles) =>
        currentVehicles.map((currentVehicle) =>
          currentVehicle.id === vehicle.id
            ? { ...currentVehicle, photo: data.data?.photo || photo }
            : currentVehicle
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload vehicle photo')
    }
  }

  return (
    <div className="vehicle-management-container">
      <h2>Vehicle Management</h2>

      <button 
        className="add-vehicle-btn"
        onClick={() => handleAddClick()}
      >
        + Add Vehicle
      </button>

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
              <button 
                className="close-btn" 
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div>
                <label htmlFor="vehicle-type">Vehicle Type:</label>
                <input
                  id="vehicle-type"
                  type="text"
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  placeholder="e.g., Car, SUV, Van"
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="vehicle-quantity">Quantity Available:</label>
                <input
                  id="vehicle-quantity"
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="e.g., 5"
                  min="1"
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="vehicle-photo">Vehicle Photo:</label>
                <input
                  id="vehicle-photo"
                  key={`photo-${isModalOpen}`}
                  type="file"
                  name="photo"
                  onChange={handleChange}
                  accept="image/*"
                  autoComplete="off"
                />
                {photoPreview && (
                  <>
                    <div
                      style={{
                        marginTop: '10px',
                        width: '220px',
                        height: '220px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #ddd',
                      }}
                    >
                      <img
                        src={photoPreview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                          display: 'block',
                        }}
                      />
                    </div>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>Photo selected</p>
                  </>
                )}
              </div>

              {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
              {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}

              <div className="modal-buttons">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="submit-btn"
                >
                  {loading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Vehicle' : 'Add Vehicle')}
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => {
                    setIsModalOpen(false)
                    setFormData({ vehicle_type: '', quantity: '', photo: '' })
                    setPhotoPreview('')
                    setError('')
                    setSuccess('')
                    setEditingId(null)
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h3>Available Vehicle Types</h3>
      {vehicles.length === 0 ? (
        <p>No vehicle types added yet</p>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          {vehicles.map(vehicle => {
            const imageUrl = vehicle.photo || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 180" style="background:%23e0e0e0"%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%23666"%3ENo Image%3C/text%3E%3C/svg%3E'
            
            return (
              <div 
                key={vehicle.id}
                style={{
                  border: '1px solid #e0e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                  backgroundColor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => {
                  const elem = e.currentTarget as HTMLElement
                  elem.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)'
                  elem.style.transform = 'translateY(-4px)'
                }}
                onMouseOut={(e: React.MouseEvent<HTMLDivElement>) => {
                  const elem = e.currentTarget as HTMLElement
                  elem.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)'
                  elem.style.transform = 'translateY(0)'
                }}
              >
                {/* Photo Section */}
                <div style={{ position: 'relative' }}>
                  <img 
                    src={imageUrl} 
                    alt={vehicle.vehicle_type}
                    style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                  />
                  
                  {/* Upload Photo Label */}
                  <label 
                    htmlFor={`vehicle-photo-${vehicle.id}`}
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(52, 152, 219, 0.9)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(52, 152, 219, 1)'
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(52, 152, 219, 0.9)'
                    }}
                  >
                    📷 Upload
                  </label>
                  
                  <input 
                    id={`vehicle-photo-${vehicle.id}`}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0]
                      if (file) {
                        void handleInlinePhotoUpload(vehicle, file)
                      }
                    }}
                  />
                </div>

                {/* Content Section */}
                <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>
                    {vehicle.vehicle_type}
                  </h4>
                  <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>
                    <strong>Quantity:</strong> {vehicle.quantity}
                  </p>
                  
                  {/* Buttons Section */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    marginTop: 'auto'
                  }}>
                    <button 
                      onClick={() => handleEditClick(vehicle)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: '#f39c12',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#e67e22'
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#f39c12'
                      }}
                    >
                      ✎ Modify
                    </button>
                    <button 
                      onClick={() => handleDelete(vehicle.id)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        transition: 'background-color 0.3s'
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#c0392b'
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#e74c3c'
                      }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

