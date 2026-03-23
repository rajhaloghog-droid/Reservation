import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from './api'

interface Employee {
  id: number
  position: string
  name: string
  department_branch: string
  created_at?: string
}

interface EmployeeForm {
  position: string
  name: string
  department_branch: string
}

export default function EmployeeManagement({ token }: { token: string }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState<EmployeeForm>({
    position: '',
    name: '',
    department_branch: ''
  })

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmployees(data.data || [])
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to load employees' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error: ' + (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const resetForm = () => {
    setForm({
      position: '',
      name: '',
      department_branch: ''
    })
    setEditingEmployeeId(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!form.position.trim() || !form.name.trim() || !form.department_branch.trim()) {
      setMessage({ type: 'error', text: 'Position, name, and Dept./Branch are required' })
      return
    }

    try {
      setSubmitting(true)
      const isEditing = editingEmployeeId !== null
      const res = await fetch(
        isEditing ? `${API_BASE_URL}/api/employees/${editingEmployeeId}` : `${API_BASE_URL}/api/employees`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(form)
        }
      )
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: isEditing ? 'Employee updated successfully' : 'Employee added successfully' })
        resetForm()
        await fetchEmployees()
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to save employee' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error: ' + (err as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (employee: Employee) => {
    setMessage(null)
    setEditingEmployeeId(employee.id)
    setForm({
      position: employee.position,
      name: employee.name,
      department_branch: employee.department_branch
    })
  }

  const handleDelete = async (employeeId: number) => {
    if (!window.confirm('Delete this employee record?')) return
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Employee deleted successfully' })
        if (editingEmployeeId === employeeId) resetForm()
        await fetchEmployees()
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete employee' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error: ' + (err as Error).message })
    }
  }

  return (
    <div className="admin-panel-container">
      {message && (
        <div className={`admin-panel-alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="admin-tab-panel">
        <h2>{editingEmployeeId ? 'Edit Employee' : 'Add Employee'}</h2>
        <p className="admin-tab-description">Manage employee profile details used by admin operations.</p>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-group">
            <label htmlFor="employee-position">Position *</label>
            <input
              id="employee-position"
              type="text"
              name="position"
              value={form.position}
              onChange={handleChange}
              placeholder="Enter employee position"
              autoComplete="organization-title"
              disabled={submitting}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="employee-name">Name *</label>
            <input
              id="employee-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter employee name"
              autoComplete="name"
              disabled={submitting}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="employee-dept">Dept./Branch *</label>
            <input
              id="employee-dept"
              type="text"
              name="department_branch"
              value={form.department_branch}
              onChange={handleChange}
              placeholder="Enter department or branch"
              autoComplete="organization"
              disabled={submitting}
            />
          </div>

          <button type="submit" className="admin-submit-btn" disabled={submitting}>
            {submitting
              ? (editingEmployeeId ? 'Updating Employee...' : 'Adding Employee...')
              : (editingEmployeeId ? 'Update Employee' : 'Add Employee')}
          </button>
          {editingEmployeeId && (
            <button
              type="button"
              className="admin-submit-btn"
              onClick={resetForm}
              style={{ marginTop: 10, background: '#8b8f96' }}
            >
              Cancel Edit
            </button>
          )}
        </form>

        <h3>Employee Records</h3>
        {loading && <p>Loading employees...</p>}
        {!loading && employees.length === 0 && <p>No employees added yet.</p>}
        {!loading && employees.length > 0 && (
          <div className="admin-home-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Name</th>
                  <th>Dept./Branch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.position}</td>
                    <td>{employee.name}</td>
                    <td>{employee.department_branch}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleEdit(employee)}
                        style={{ backgroundColor: '#f39c12', marginRight: 8 }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(employee.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
