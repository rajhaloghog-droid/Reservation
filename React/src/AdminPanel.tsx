import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from './api'

interface AddCompanyForm {
  name: string
}

interface AddUserForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'admin' | 'user'
  companyId?: string
}

interface Company {
  id: number
  name: string
  email: string
  phone: string
  address?: string
}

interface UserAccount {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
  company_id: number | null
}

interface AdminPanelProps {
  token: string
  activeTab?: 'company' | 'user'
  onTabChange?: (tab: 'company' | 'user') => void
  showSidebarTabs?: boolean
}

export default function AdminPanel({
  token,
  activeTab: controlledActiveTab,
  onTabChange: controlledOnTabChange,
  showSidebarTabs = true
}: AdminPanelProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'company' | 'user'>('company')
  const activeTab = controlledActiveTab ?? internalActiveTab
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)

  // Add Company Form State
  const [companyForm, setCompanyForm] = useState<AddCompanyForm>({
    name: ''
  })
  const [submittingCompany, setSubmittingCompany] = useState(false)

  // Add User Form State
  const [userForm, setUserForm] = useState<AddUserForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    companyId: ''
  })
  const [submittingUser, setSubmittingUser] = useState(false)

  const fetchCompanies = useCallback(async () => {
    try {
      setLoadingCompanies(true)
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
    } finally {
      setLoadingCompanies(false)
    }
  }, [token])

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true)
      setMessage(null)
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setUsers(data.data || [])
      } else if (res.status === 403) {
        setUsers([])
        setMessage({ type: 'error', text: 'Only admin accounts can view and manage users.' })
      } else {
        setUsers([])
        setMessage({ type: 'error', text: data.message || 'Failed to load users' })
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setUsers([])
      setMessage({ type: 'error', text: 'Network error: ' + (err as Error).message })
    } finally {
      setLoadingUsers(false)
    }
  }, [token])

  useEffect(() => {
    if ((activeTab === 'user' || activeTab === 'company') && companies.length === 0) {
      fetchCompanies()
    }
    if (activeTab === 'user' && users.length === 0) {
      fetchUsers()
    }
  }, [activeTab, companies.length, users.length, fetchCompanies, fetchUsers])

  const handleTabChange = async (tab: 'company' | 'user') => {
    if (controlledOnTabChange) {
      controlledOnTabChange(tab)
    } else {
      setInternalActiveTab(tab)
    }
    setMessage(null)
    
    if (tab === 'company' && companies.length === 0) {
      await fetchCompanies()
    }
    if (tab === 'user') {
      if (companies.length === 0) {
        await fetchCompanies()
      }
      if (users.length === 0) {
        await fetchUsers()
      }
    }
  }

  const resetCompanyForm = () => {
    setCompanyForm({ name: '' })
    setEditingCompanyId(null)
  }

  const resetUserForm = () => {
    setUserForm({ name: '', email: '', password: '', confirmPassword: '', role: 'user', companyId: '' })
    setEditingUserId(null)
  }

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCompanyForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setUserForm(prev => {
      if (name === 'role') {
        return {
          ...prev,
          role: value === 'admin' ? 'admin' : 'user'
        }
      }
      if (name === 'companyId') {
        return {
          ...prev,
          companyId: value
        }
      }
      if (name === 'name' || name === 'email' || name === 'password' || name === 'confirmPassword') {
        return {
          ...prev,
          [name]: value
        }
      }
      return prev
    })
  }

  const handleEditCompany = (company: Company) => {
    setMessage(null)
    setEditingCompanyId(company.id)
    setCompanyForm({
      name: company.name
    })
  }

  const handleDeleteCompany = async (companyId: number) => {
    if (!window.confirm('Delete this company?')) return
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Company deleted successfully!' })
        if (editingCompanyId === companyId) resetCompanyForm()
        await fetchCompanies()
        await fetchUsers()
        window.dispatchEvent(new Event('companiesUpdated'))
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete company' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error: ' + (err as Error).message })
    }
  }

  const handleEditUser = (user: UserAccount) => {
    setMessage(null)
    setEditingUserId(user.id)
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      companyId: user.company_id ? String(user.company_id) : ''
    })
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Delete this user account?')) return
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'User deleted successfully!' })
        if (editingUserId === userId) resetUserForm()
        await fetchUsers()
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete user' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error: ' + (err as Error).message })
    }
  }

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!companyForm.name.trim()) {
      setMessage({ type: 'error', text: 'Company name is required' })
      return
    }

    try {
      setSubmittingCompany(true)
      const isEditing = editingCompanyId !== null
      const res = await fetch(
        isEditing ? `${API_BASE_URL}/api/companies/${editingCompanyId}` : `${API_BASE_URL}/api/companies`,
        {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(companyForm)
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setMessage({ type: 'success', text: isEditing ? 'Company updated successfully!' : 'Company added successfully!' })
        resetCompanyForm()
        await fetchCompanies()
        await fetchUsers()
        window.dispatchEvent(new Event('companiesUpdated'))
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to add company' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error: ' + (err as Error).message })
    } finally {
      setSubmittingCompany(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validation
    if (!userForm.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' })
      return
    }
    if (!userForm.email.trim()) {
      setMessage({ type: 'error', text: 'Email is required' })
      return
    }
    const isEditing = editingUserId !== null
    const isPasswordProvided = Boolean(userForm.password)

    if (!isEditing && !userForm.password) {
      setMessage({ type: 'error', text: 'Password is required' })
      return
    }
    if (isPasswordProvided && userForm.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    if (isPasswordProvided && userForm.password !== userForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    if (!userForm.role) {
      setMessage({ type: 'error', text: 'Please select a role' })
      return
    }

    try {
      setSubmittingUser(true)
      const payload: Record<string, string | null> = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        company_id: userForm.companyId || null
      }
      if (!isEditing || isPasswordProvided) {
        payload.password = userForm.password
      }

      const res = await fetch(
        isEditing ? `${API_BASE_URL}/api/users/${editingUserId}` : `${API_BASE_URL}/api/users`,
        {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setMessage({ type: 'success', text: isEditing ? 'User account updated successfully!' : 'User account added successfully!' })
        resetUserForm()
        await fetchUsers()
      } else {
        const friendly =
          res.status === 409
            ? 'User email already exists'
            : res.status === 403
              ? 'Only admin accounts can add or update users.'
              : data.message || 'Failed to add user'
        setMessage({ type: 'error', text: friendly })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error: ' + (err as Error).message })
    } finally {
      setSubmittingUser(false)
    }
  }

  return (
    <div className="admin-panel-container">
      {/* Sidebar Tabs */}
      {showSidebarTabs && (
        <div className="admin-sidebar-tabs">
          <button
            className={`admin-tab-btn ${activeTab === 'company' ? 'active' : ''}`}
            onClick={() => handleTabChange('company')}
          >
            Add Company
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => handleTabChange('user')}
          >
            Add User
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="admin-tab-content">
        {/* Message Alert */}
        {message && (
          <div className={`admin-panel-alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Add Company Tab */}
        {activeTab === 'company' && (
          <div className="admin-tab-panel">
            <h2>{editingCompanyId ? 'Edit Company' : 'Add Company'}</h2>
            <p className="admin-tab-description">
              {editingCompanyId ? 'Update selected company details' : 'Add a new company to the system'}
            </p>
            
            <form onSubmit={handleAddCompany} className="admin-form">
              <div className="admin-form-group">
                <label htmlFor="company-name">Company Name *</label>
                <input
                  id="company-name"
                  type="text"
                  name="name"
                  value={companyForm.name}
                  onChange={handleCompanyChange}
                  placeholder="Enter company name"
                  autoComplete="organization"
                  disabled={submittingCompany}
                />
              </div>

              <button
                type="submit"
                className="admin-submit-btn"
                disabled={submittingCompany}
              >
                {submittingCompany
                  ? (editingCompanyId ? 'Updating Company...' : 'Adding Company...')
                  : (editingCompanyId ? 'Update Company' : 'Add Company')}
              </button>
              {editingCompanyId && (
                <button
                  type="button"
                  className="admin-submit-btn"
                  onClick={resetCompanyForm}
                  style={{ marginTop: 10, background: '#8b8f96' }}
                >
                  Cancel Edit
                </button>
              )}
            </form>

            <h3>Company Accounts</h3>
            {loadingCompanies && <p>Loading companies...</p>}
            {!loadingCompanies && companies.length === 0 && <p>No companies added yet.</p>}
            {!loadingCompanies && companies.length > 0 && (
              <div className="admin-home-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id}>
                        <td>{company.name}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleEditCompany(company)}
                            style={{ backgroundColor: '#f39c12', marginRight: 8 }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompany(company.id)}
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
        )}

        {/* Add User Tab */}
        {activeTab === 'user' && (
          <div className="admin-tab-panel">
            <h2>{editingUserId ? 'Edit User Account' : 'Add User Account'}</h2>
            <p className="admin-tab-description">
              {editingUserId ? 'Update selected user details' : 'Add a new user account with role assignment'}
            </p>
            
            <form onSubmit={handleAddUser} className="admin-form">
              <div className="admin-form-group">
                <label htmlFor="user-name">Full Name *</label>
                <input
                  id="user-name"
                  type="text"
                  name="name"
                  value={userForm.name}
                  onChange={handleUserChange}
                  placeholder="Enter full name"
                  autoComplete="name"
                  disabled={submittingUser}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="user-email">Email *</label>
                <input
                  id="user-email"
                  type="email"
                  name="email"
                  value={userForm.email}
                  onChange={handleUserChange}
                  placeholder="Enter email address"
                  autoComplete="email"
                  disabled={submittingUser}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="user-role">Role *</label>
                <select
                  id="user-role"
                  name="role"
                  value={userForm.role}
                  onChange={handleUserChange}
                  disabled={submittingUser}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {userForm.role === 'user' && (
                <div className="admin-form-group">
                  <label htmlFor="user-company">Company (Optional)</label>
                  <select
                    id="user-company"
                    name="companyId"
                    value={userForm.companyId || ''}
                    onChange={handleUserChange}
                    disabled={submittingUser || loadingCompanies}
                  >
                    <option value="">Select a company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="admin-form-group">
                <label htmlFor="user-password">
                  {editingUserId ? 'Password (Leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  id="user-password"
                  type="password"
                  name="password"
                  value={userForm.password}
                  onChange={handleUserChange}
                  placeholder="Enter password (min 6 characters)"
                  autoComplete="new-password"
                  disabled={submittingUser}
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="user-confirm-password">
                  {editingUserId ? 'Confirm Password' : 'Confirm Password *'}
                </label>
                <input
                  id="user-confirm-password"
                  type="password"
                  name="confirmPassword"
                  value={userForm.confirmPassword}
                  onChange={handleUserChange}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  disabled={submittingUser}
                />
              </div>

              <button
                type="submit"
                className="admin-submit-btn"
                disabled={submittingUser}
              >
                {submittingUser
                  ? (editingUserId ? 'Updating User...' : 'Adding User...')
                  : (editingUserId ? 'Update User Account' : 'Add User Account')}
              </button>
              {editingUserId && (
                <button
                  type="button"
                  className="admin-submit-btn"
                  onClick={resetUserForm}
                  style={{ marginTop: 10, background: '#8b8f96' }}
                >
                  Cancel Edit
                </button>
              )}
            </form>

            <h3>User Accounts</h3>
            {loadingUsers && <p>Loading users...</p>}
            {!loadingUsers && users.length === 0 && <p>No users added yet.</p>}
            {!loadingUsers && users.length > 0 && (
              <div className="admin-home-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Company</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>{companies.find((company) => company.id === user.company_id)?.name || '-'}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleEditUser(user)}
                            style={{ backgroundColor: '#f39c12', marginRight: 8 }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
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
        )}
      </div>
    </div>
  )
}
